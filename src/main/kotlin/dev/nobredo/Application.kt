package dev.nobredo

import dev.nobredo.config.AppConfig
import dev.nobredo.db.Store
import dev.nobredo.domain.PasswordHasher
import dev.nobredo.routes.adminRoutes
import dev.nobredo.routes.publicRoutes
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.createApplicationPlugin
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.UserIdPrincipal
import io.ktor.server.auth.basic
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import java.security.MessageDigest
import java.time.Clock

fun main(args: Array<String>) {
    if (args.firstOrNull() == "hash-password") {
        System.err.print("Senha do admin: ")
        val password = System.console()?.readPassword()?.concatToString() ?: readlnOrNull().orEmpty()
        require(password.length >= 12) { "Use pelo menos 12 caracteres" }
        println(PasswordHasher.hash(password))
        return
    }
    val config = AppConfig.fromEnv()
    val store = Store.open(config.dbPath)
    embeddedServer(Netty, port = config.port) { module(config, store, Clock.systemUTC()) }.start(wait = true)
}

fun Application.module(config: AppConfig, store: Store, clock: Clock) {
    install(ContentNegotiation) { json() }

    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to (cause.message ?: "requisição inválida")))
        }
    }

    install(Authentication) {
        basic("admin") {
            realm = "admin"
            validate { credentials ->
                val userOk = MessageDigest.isEqual(credentials.name.toByteArray(), config.adminUser.toByteArray())
                val passOk = PasswordHasher.verify(credentials.password, config.adminPasswordHash)
                if (userOk && passOk) UserIdPrincipal(credentials.name) else null
            }
        }
    }

    // Nada aqui deve aparecer em buscadores.
    install(createApplicationPlugin("Privacy") {
        onCall { call ->
            call.response.headers.append("X-Robots-Tag", "noindex, nofollow, noarchive")
            call.response.headers.append("Referrer-Policy", "no-referrer")
        }
    })

    routing {
        get("/robots.txt") { call.respondText("User-agent: *\nDisallow: /\n", ContentType.Text.Plain) }
        publicRoutes(config, store, clock)
        adminRoutes(config, store, clock)
    }
}
