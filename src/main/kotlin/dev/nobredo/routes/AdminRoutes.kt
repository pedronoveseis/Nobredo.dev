package dev.nobredo.routes

import dev.nobredo.config.AppConfig
import dev.nobredo.db.Store
import dev.nobredo.domain.Phase
import dev.nobredo.domain.PhaseMachine
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.time.Clock
import java.time.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

@Serializable
data class NewDrop(
    val kind: String,
    val payload: JsonObject,
    val hint: String? = null,
    val position: Int = 0,
    /** Se ausente, o drop fica como rascunho. Instante futuro agenda a publicação. */
    val publishAt: String? = null,
)

@Serializable
data class AdminDrop(
    val id: Int,
    val kind: String,
    val payload: JsonElement,
    val hint: String?,
    val position: Int,
    val publishedAt: String?,
    val visible: Boolean,
)

private val kindPattern = Regex("[a-z_]{1,32}")

fun Route.adminRoutes(config: AppConfig, store: Store, clock: Clock) {
    authenticate("admin") {
        route("/admin/api") {
            get("/drops") {
                val now = Instant.now(clock)
                call.respond(
                    store.allDrops().map {
                        AdminDrop(
                            id = it.id,
                            kind = it.kind,
                            payload = kotlinx.serialization.json.Json.parseToJsonElement(it.payload),
                            hint = it.hint,
                            position = it.position,
                            publishedAt = it.publishedAt?.toString(),
                            visible = it.publishedAt != null && it.publishedAt <= now,
                        )
                    },
                )
            }

            post("/drops") {
                val body = call.receive<NewDrop>()
                require(kindPattern.matches(body.kind)) { "kind deve ter só letras minúsculas e '_' (até 32)" }
                val id = store.addDrop(
                    kind = body.kind,
                    payload = body.payload.toString(),
                    hint = body.hint,
                    position = body.position,
                    publishedAt = body.publishAt?.let { Instant.parse(it) },
                )
                call.respond(HttpStatusCode.Created, mapOf("id" to id))
            }

            // "Mexi no site": publica agora.
            post("/drops/{id}/publish") {
                val id = call.parameters["id"]?.toIntOrNull() ?: return@post call.respond(HttpStatusCode.BadRequest)
                if (store.publish(id, Instant.now(clock))) call.respond(HttpStatusCode.NoContent)
                else call.respond(HttpStatusCode.NotFound)
            }

            // Conteúdo da cena final: vive só no banco, nunca no repositório.
            put("/final-scene") {
                store.putSetting(Store.FINAL_SCENE, call.receive<JsonObject>().toString())
                call.respond(HttpStatusCode.NoContent)
            }

            // "Ela aceitou": só depois que a contagem zerou.
            post("/together") {
                val now = Instant.now(clock)
                val current = store.setting(Store.TOGETHER_SINCE)?.let(Instant::parse)
                if (PhaseMachine.at(now, config.targetAt, current) != Phase.AWAITING) {
                    return@post call.respond(
                        HttpStatusCode.Conflict,
                        mapOf("error" to "Só é possível registrar o 'sim' depois que a contagem zerar (e uma vez)."),
                    )
                }
                store.putSetting(Store.TOGETHER_SINCE, now.toString())
                call.respond(mapOf("togetherSince" to now.toString()))
            }
        }
    }
}
