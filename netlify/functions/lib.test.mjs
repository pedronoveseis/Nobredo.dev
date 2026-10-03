import test from "node:test";
import assert from "node:assert/strict";
import { buildState, tokenOk } from "./lib.mjs";

const T = Date.parse("2026-11-22T16:00:00-03:00");
const env = { FINAL_WORD: "PALAVRA" };
const drops = [
  { id: 1, kind: "texto", payload: { text: "a" } },
  { id: 2, kind: "texto", payload: { text: "futuro" }, publishAt: "2026-11-01T00:00:00Z" },
];

test("antes do alvo: sem cena final nem contagem progressiva", () => {
  const s = buildState({ env, now: T - 1000, drops });
  assert.equal(s.phase, "COUNTDOWN");
  assert.equal(s.finalScene, null);
  assert.equal(s.togetherSince, null);
  assert.deepEqual(s.drops.map((d) => d.id), [1, 2]);
  assert.ok(!JSON.stringify(s).includes("PALAVRA"));
});

test("drop agendado aparece só depois da hora", () => {
  const before = buildState({ env, now: Date.parse("2026-10-31T00:00:00Z"), drops });
  const after = buildState({ env, now: Date.parse("2026-11-01T00:00:01Z"), drops });
  assert.equal(before.drops.length, 1);
  assert.equal(after.drops.length, 2);
  assert.ok(!("publishAt" in after.drops[1]));
});

test("no alvo: cena final e contagem progressiva a partir do alvo", () => {
  const s = buildState({ env, now: T, drops });
  assert.equal(s.phase, "TOGETHER");
  assert.deepEqual(s.finalScene, { word: "PALAVRA" });
  assert.equal(s.togetherSince, new Date(T).toISOString());
});

test("TOGETHER_SINCE sobrescreve o início da contagem", () => {
  const s = buildState({ env: { ...env, TOGETHER_SINCE: "2026-11-22T16:07:00-03:00" }, now: T + 3600e3, drops });
  assert.equal(s.togetherSince, "2026-11-22T19:07:00.000Z");
});

test("token", () => {
  const t = "abcdefghijklmnop1234";
  assert.ok(tokenOk(t, t));
  assert.ok(!tokenOk("x", t));
  assert.ok(!tokenOk(t, ""));
  assert.ok(!tokenOk(undefined, t));
});
