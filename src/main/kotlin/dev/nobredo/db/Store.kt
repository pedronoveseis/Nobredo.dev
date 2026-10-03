package dev.nobredo.db

import java.time.Instant
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.isNotNull
import org.jetbrains.exposed.v1.core.lessEq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.jetbrains.exposed.v1.jdbc.upsert

object Drops : Table("drops") {
    val id = integer("id").autoIncrement()
    val kind = varchar("kind", 32)
    val payload = text("payload")
    val hint = text("hint").nullable()
    val position = integer("position").default(0)

    /** null = rascunho. Um instante futuro agenda a publicação. Epoch em milissegundos. */
    val publishedAt = long("published_at").nullable()
    override val primaryKey = PrimaryKey(id)
}

object Settings : Table("settings") {
    val key = varchar("key", 64)
    val value = text("value")
    override val primaryKey = PrimaryKey(key)
}

data class DropRow(
    val id: Int,
    val kind: String,
    val payload: String,
    val hint: String?,
    val position: Int,
    val publishedAt: Instant?,
)

class Store(private val db: Database) {
    init {
        transaction(db) { SchemaUtils.create(Drops, Settings) }
    }

    fun allDrops(): List<DropRow> = transaction(db) {
        Drops.selectAll().orderBy(Drops.position to SortOrder.ASC, Drops.id to SortOrder.ASC).map { it.toRow() }
    }

    /** Só o que já foi publicado e já passou da hora. É o único caminho para o que o site público enxerga. */
    fun visibleDrops(now: Instant): List<DropRow> = transaction(db) {
        Drops.selectAll()
            .where { Drops.publishedAt.isNotNull() and (Drops.publishedAt lessEq now.toEpochMilli()) }
            .orderBy(Drops.position to SortOrder.ASC, Drops.id to SortOrder.ASC)
            .map { it.toRow() }
    }

    fun addDrop(kind: String, payload: String, hint: String?, position: Int, publishedAt: Instant?): Int =
        transaction(db) {
            Drops.insert {
                it[Drops.kind] = kind
                it[Drops.payload] = payload
                it[Drops.hint] = hint
                it[Drops.position] = position
                it[Drops.publishedAt] = publishedAt?.toEpochMilli()
            }[Drops.id]
        }

    fun publish(id: Int, at: Instant): Boolean = transaction(db) {
        Drops.update({ Drops.id eq id }) { it[publishedAt] = at.toEpochMilli() } > 0
    }

    fun setting(key: String): String? = transaction(db) {
        Settings.selectAll().where { Settings.key eq key }.firstOrNull()?.get(Settings.value)
    }

    fun putSetting(key: String, value: String) {
        transaction(db) {
            Settings.upsert {
                it[Settings.key] = key
                it[Settings.value] = value
            }
        }
    }

    private fun org.jetbrains.exposed.v1.core.ResultRow.toRow() = DropRow(
        id = this[Drops.id],
        kind = this[Drops.kind],
        payload = this[Drops.payload],
        hint = this[Drops.hint],
        position = this[Drops.position],
        publishedAt = this[Drops.publishedAt]?.let(Instant::ofEpochMilli),
    )

    companion object {
        const val TOGETHER_SINCE = "together_since"
        const val FINAL_SCENE = "final_scene"

        fun open(path: String): Store {
            java.io.File(path).absoluteFile.parentFile?.mkdirs()
            return Store(Database.connect("jdbc:sqlite:$path", driver = "org.sqlite.JDBC"))
        }
    }
}
