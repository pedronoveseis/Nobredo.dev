// Lógica pura (testável): decide o que o cliente pode ver agora.
// Nada de futuro sai daqui: rascunhos ficam fora de content/drops.json
// e a cena final só é devolvida depois de TARGET_AT.

export const DEFAULT_TARGET_AT = "2026-11-22T16:00:00-03:00";

export function tokenOk(given, expected) {
  if (!expected || expected.length < 16 || typeof given !== "string") return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function buildState({ env, now, drops }) {
  const targetMs = Date.parse(env.TARGET_AT || DEFAULT_TARGET_AT);
  const reached = now >= targetMs;
  const phase = reached ? "TOGETHER" : "COUNTDOWN";
  const togetherSince = reached ? new Date(Date.parse(env.TOGETHER_SINCE || "") || targetMs).toISOString() : null;

  const visible = drops.filter((d) => !d.publishAt || Date.parse(d.publishAt) <= now);
  const word = env.FINAL_WORD || "";

  return {
    phase,
    serverNow: new Date(now).toISOString(),
    targetAt: new Date(targetMs).toISOString(),
    togetherSince,
    drops: visible.map(({ publishAt, ...d }) => d),
    finalScene: reached && word ? { word } : null,
  };
}
