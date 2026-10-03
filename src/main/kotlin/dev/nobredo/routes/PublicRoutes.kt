package dev.nobredo.routes

import dev.nobredo.config.AppConfig
import dev.nobredo.db.DropRow
import dev.nobredo.db.Store
import dev.nobredo.domain.Phase
import dev.nobredo.domain.PhaseMachine
import io.ktor.http.CacheControl
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.http.content.staticResources
import io.ktor.server.response.cacheControl
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import java.security.MessageDigest
import java.time.Clock
import java.time.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

@Serializable
data class PublicDrop(val id: Int, val kind: String, val payload: JsonElement, val hint: String?)

/**
 * O que o navegador dela recebe. `finalScene` só existe a partir de AWAITING:
 * antes disso o conteúdo nem sai do servidor.
 */
@Serializable
data class PublicState(
    val phase: Phase,
    val serverNow: String,
    val targetAt: String,
    val togetherSince: String?,
    val drops: List<PublicDrop>,
    val finalScene: JsonElement?,
)

private val pageHtml: String by lazy {
    object {}.javaClass.getResource("/web/index.html")!!.readText()
}

fun Route.publicRoutes(config: AppConfig, store: Store, clock: Clock) {
    staticResources("/assets", "static")

    fun tokenMatches(candidate: String?): Boolean =
        candidate != null && MessageDigest.isEqual(candidate.toByteArray(), config.linkToken.toByteArray())

    get("/p/{token}") {
        if (!tokenMatches(call.parameters["token"])) return@get call.respond(HttpStatusCode.NotFound)
        call.response.cacheControl(CacheControl.NoStore(null))
        call.respondText(pageHtml, ContentType.Text.Html)
    }

    get("/api/p/{token}/state") {
        if (!tokenMatches(call.parameters["token"])) return@get call.respond(HttpStatusCode.NotFound)

        val now = Instant.now(clock)
        val togetherSince = store.setting(Store.TOGETHER_SINCE)?.let(Instant::parse)
        val phase = PhaseMachine.at(now, config.targetAt, togetherSince)

        val state = PublicState(
            phase = phase,
            serverNow = now.toString(),
            targetAt = config.targetAt.toString(),
            togetherSince = togetherSince?.takeIf { phase == Phase.TOGETHER }?.toString(),
            drops = store.visibleDrops(now).map { it.toPublic() },
            finalScene = if (phase == Phase.COUNTDOWN) null else store.setting(Store.FINAL_SCENE)?.let(Json::parseToJsonElement),
        )
        call.response.cacheControl(CacheControl.NoStore(null))
        call.respond(state)
    }
}

private fun DropRow.toPublic() = PublicDrop(id, kind, Json.parseToJsonElement(payload), hint)
