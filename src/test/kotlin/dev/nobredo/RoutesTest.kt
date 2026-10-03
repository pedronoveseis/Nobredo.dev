package dev.nobredo

import dev.nobredo.config.AppConfig
import dev.nobredo.db.Store
import dev.nobredo.domain.PasswordHasher
import io.ktor.client.request.basicAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.nio.file.Files
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class MutableClock(var now: Instant) : Clock() {
    override fun getZone() = ZoneOffset.UTC
    override fun withZone(zone: java.time.ZoneId?) = this
    override fun instant(): Instant = now
}

class RoutesTest {
    private val token = "token-de-teste-1234567890"
    private val target = Instant.parse("2026-11-22T19:00:00Z")
    private val password = "senha-de-teste-longa"
    private val passwordHash = PasswordHasher.hash(password, iterations = 1_000)

    private fun withApp(clock: MutableClock, block: suspend ApplicationTestBuilder.() -> Unit) {
        val dir = Files.createTempDirectory("nobredo-test")
        val config = AppConfig(
            port = 0,
            dbPath = dir.resolve("test.db").toString(),
            linkToken = token,
            targetAt = target,
            adminUser = "admin",
            adminPasswordHash = passwordHash,
        )
        val store = Store.open(config.dbPath)
        testApplication {
            application { module(config, store, clock) }
            block()
        }
    }

    private suspend fun ApplicationTestBuilder.state(): JsonObject =
        Json.parseToJsonElement(client.get("/api/p/$token/state").bodyAsText()).jsonObject

    private suspend fun ApplicationTestBuilder.admin(path: String, body: String? = null, put: Boolean = false) =
        (if (put) client.put(path) {
            basicAuth("admin", password); contentType(ContentType.Application.Json); body?.let { setBody(it) }
        } else client.post(path) {
            basicAuth("admin", password); contentType(ContentType.Application.Json); body?.let { setBody(it) }
        })

    @Test
    fun `token errado nao revela nada`() = withApp(MutableClock(target.minus(Duration.ofDays(10)))) {
        assertEquals(HttpStatusCode.NotFound, client.get("/p/errado").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/api/p/errado/state").status)
        assertEquals(HttpStatusCode.OK, client.get("/p/$token").status)
    }

    @Test
    fun `respostas sao noindex`() = withApp(MutableClock(target.minus(Duration.ofDays(1)))) {
        assertTrue(client.get("/p/$token").headers["X-Robots-Tag"]!!.contains("noindex"))
        assertTrue(client.get("/robots.txt").bodyAsText().contains("Disallow: /"))
    }

    @Test
    fun `admin exige credenciais`() = withApp(MutableClock(target.minus(Duration.ofDays(1)))) {
        assertEquals(HttpStatusCode.Unauthorized, client.get("/admin/api/drops").status)
        val wrong = client.get("/admin/api/drops") { basicAuth("admin", "errada") }
        assertEquals(HttpStatusCode.Unauthorized, wrong.status)
    }

    @Test
    fun `rascunho e agendado nao aparecem, publicado aparece`() {
        val clock = MutableClock(target.minus(Duration.ofDays(5)))
        withApp(clock) {
            val draft = admin("/admin/api/drops", """{"kind":"texto","payload":{"text":"rascunho"}}""")
            assertEquals(HttpStatusCode.Created, draft.status)
            admin("/admin/api/drops", """{"kind":"texto","payload":{"text":"amanha"},"publishAt":"${clock.now.plusSeconds(86400)}"}""")
            val now = admin("/admin/api/drops", """{"kind":"flor","payload":{"name":"girassol"},"publishAt":"${clock.now}"}""")
            assertEquals(HttpStatusCode.Created, now.status)

            val drops = state()["drops"]!!.jsonArray
            assertEquals(1, drops.size)
            assertEquals("flor", drops[0].jsonObject["kind"]!!.jsonPrimitive.content)

            clock.now = clock.now.plusSeconds(86401)
            assertEquals(2, state()["drops"]!!.jsonArray.size)

            assertEquals(HttpStatusCode.NoContent, admin("/admin/api/drops/1/publish").status)
            assertEquals(3, state()["drops"]!!.jsonArray.size)
        }
    }

    @Test
    fun `cena final so sai do servidor depois do alvo`() {
        val clock = MutableClock(target.minusSeconds(1))
        withApp(clock) {
            admin("/admin/api/final-scene", """{"word":"PALAVRA"}""", put = true)

            val before = client.get("/api/p/$token/state").bodyAsText()
            assertEquals("COUNTDOWN", state()["phase"]!!.jsonPrimitive.content)
            assertFalse(before.contains("PALAVRA"), "a cena final vazou antes da hora")

            clock.now = target
            val after = state()
            assertEquals("AWAITING", after["phase"]!!.jsonPrimitive.content)
            assertEquals("PALAVRA", after["finalScene"]!!.jsonObject["word"]!!.jsonPrimitive.content)
        }
    }

    @Test
    fun `sim so pode ser registrado depois do alvo e uma vez`() {
        val clock = MutableClock(target.minusSeconds(60))
        withApp(clock) {
            assertEquals(HttpStatusCode.Conflict, admin("/admin/api/together").status)

            clock.now = target.plusSeconds(120)
            assertEquals(HttpStatusCode.OK, admin("/admin/api/together").status)

            val s = state()
            assertEquals("TOGETHER", s["phase"]!!.jsonPrimitive.content)
            assertEquals(clock.now.toString(), s["togetherSince"]!!.jsonPrimitive.content)

            clock.now = clock.now.plusSeconds(600)
            assertEquals(HttpStatusCode.Conflict, admin("/admin/api/together").status)
            assertEquals(s["togetherSince"], state()["togetherSince"])
        }
    }
}
