package dev.nobredo.domain

import java.time.Instant
import kotlinx.serialization.Serializable

/**
 * Fases do site, derivadas apenas do relógio do servidor e do instante
 * em que o autor registrou o "sim".
 *
 * COUNTDOWN --(agora >= targetAt)--> AWAITING --(autor registra o "sim")--> TOGETHER
 */
@Serializable
enum class Phase { COUNTDOWN, AWAITING, TOGETHER }

object PhaseMachine {
    fun at(now: Instant, targetAt: Instant, togetherSince: Instant?): Phase = when {
        togetherSince != null && now >= togetherSince -> Phase.TOGETHER
        now >= targetAt -> Phase.AWAITING
        else -> Phase.COUNTDOWN
    }
}
