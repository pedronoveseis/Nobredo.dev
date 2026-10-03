package dev.nobredo

import dev.nobredo.domain.Phase
import dev.nobredo.domain.PhaseMachine
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

class PhaseMachineTest {
    private val target = Instant.parse("2026-11-22T19:00:00Z") // 16h em Brasília
    private val sim = target.plusSeconds(180)

    @Test
    fun `antes do alvo e contagem regressiva`() {
        assertEquals(Phase.COUNTDOWN, PhaseMachine.at(target.minusMillis(1), target, null))
    }

    @Test
    fun `no instante do alvo passa a aguardar`() {
        assertEquals(Phase.AWAITING, PhaseMachine.at(target, target, null))
        assertEquals(Phase.AWAITING, PhaseMachine.at(target.plusSeconds(3600), target, null))
    }

    @Test
    fun `depois do sim registrado e namoro`() {
        assertEquals(Phase.AWAITING, PhaseMachine.at(sim.minusMillis(1), target, sim))
        assertEquals(Phase.TOGETHER, PhaseMachine.at(sim, target, sim))
    }
}
