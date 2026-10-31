package dev.nobredo

import dev.nobredo.domain.PasswordHasher
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class PasswordHasherTest {
    @Test
    fun `verifica a senha certa e rejeita a errada`() {
        val hash = PasswordHasher.hash("uma-senha-longa", iterations = 1_000)
        assertTrue(PasswordHasher.verify("uma-senha-longa", hash))
        assertFalse(PasswordHasher.verify("outra", hash))
    }

    @Test
    fun `salt diferente a cada hash`() {
        assertNotEquals(PasswordHasher.hash("x", 1_000), PasswordHasher.hash("x", 1_000))
    }

    @Test
    fun `formato invalido nunca valida`() {
        assertFalse(PasswordHasher.verify("x", "lixo"))
        assertFalse(PasswordHasher.verify("x", "pbkdf2\$abc\$AA\$AA"))
    }
}
