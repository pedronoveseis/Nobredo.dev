package dev.nobredo.config

import java.time.Instant
import java.time.OffsetDateTime

data class AppConfig(
    val port: Int,
    val dbPath: String,
    val linkToken: String,
    val targetAt: Instant,
    val adminUser: String,
    val adminPasswordHash: String,
) {
    companion object {
        // 22/11/2026, 16h no horário de Brasília (UTC-3)
        const val DEFAULT_TARGET_AT = "2026-11-22T16:00:00-03:00"

        fun fromEnv(env: Map<String, String> = System.getenv()): AppConfig {
            fun required(name: String): String =
                env[name]?.takeIf { it.isNotBlank() }
                    ?: error("Variável de ambiente obrigatória ausente: $name")

            val token = required("LINK_TOKEN")
            require(token.length >= 16) { "LINK_TOKEN precisa ter pelo menos 16 caracteres" }
            require(token.all { it.isLetterOrDigit() || it == '-' || it == '_' }) {
                "LINK_TOKEN só pode ter letras, números, '-' e '_'"
            }

            return AppConfig(
                port = env["PORT"]?.toInt() ?: 8080,
                dbPath = env["DB_PATH"] ?: "data/nobredo.db",
                linkToken = token,
                targetAt = OffsetDateTime.parse(env["TARGET_AT"] ?: DEFAULT_TARGET_AT).toInstant(),
                adminUser = env["ADMIN_USER"] ?: "admin",
                adminPasswordHash = required("ADMIN_PASSWORD_HASH"),
            )
        }
    }
}
