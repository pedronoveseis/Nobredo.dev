import test from "node:test";
import assert from "node:assert/strict";
import { SOL_INICIO, SOL_FIM, VOLTA_S, RAIOS, fracaoSol, velocidadeGiro, raiosDe, empacotarDisco, planejarSol, faseDisco, posicaoDisco, angulo } from "../site/assets/sol.js";
import { ALVO, ordem, encaixadas } from "../site/assets/core.js";

const larguras = (n) => Array.from({ length: n }, (_, i) => 22 + ((i * 7) % 5) * 6);
const plano = (W = 390, util = 700, f = 8, n = 600, seed = 22) => {
  const w = larguras(n);
  const rank = new Array(n);
  ordem(n, seed).forEach((idx, r) => (rank[idx] = r));
  return { geo: planejarSol(W, util, f, w, rank), w, rank, f, W, util };
};

test("datas: começa em 11/11 às 08h e fecha em 15/11 00h (-03:00), antes de 21/11", () => {
  assert.equal(new Date(SOL_INICIO).toISOString(), "2026-11-11T11:00:00.000Z");
  assert.equal(new Date(SOL_FIM).toISOString(), "2026-11-15T03:00:00.000Z");
  assert.ok(SOL_FIM < ALVO);
});

test("progresso: 0 antes das 08h, cresce todo dia, 1 em 15/11", () => {
  assert.equal(fracaoSol(Date.parse("2026-11-11T07:59:00-03:00")), 0);
  assert.equal(fracaoSol(SOL_FIM), 1);
  assert.equal(fracaoSol(SOL_FIM + 1e9), 1);
  const DIA = 86400000;
  for (let t = SOL_INICIO; t + DIA <= SOL_FIM; t += DIA) {
    const novas = encaixadas(100, fracaoSol(t + DIA)) - encaixadas(100, fracaoSol(t));
    assert.ok(novas >= 20, `dia ${new Date(t).toISOString()}: só ${novas}`);
  }
});

test("giro: parado no bloco, acelera, e termina em 1 volta a cada 120 s", () => {
  assert.equal(velocidadeGiro(0), 0);
  assert.ok(velocidadeGiro(0.3) > 0 && velocidadeGiro(0.3) < velocidadeGiro(0.7));
  assert.ok(Math.abs(velocidadeGiro(1) - (2 * Math.PI) / VOLTA_S) < 1e-12);
  assert.equal(velocidadeGiro(2), velocidadeGiro(1));
});

test("raios: 10, de luz (sem palavras), nascem sob a borda do disco e saem dele, de comprimentos diferentes", () => {
  assert.equal(RAIOS.length, 10);
  const r = raiosDe(100);
  assert.equal(r.length, 10);
  for (const x of r) assert.ok(x.r0 < 100 && x.rFim > 100 && x.larg > 0);
  const comps = r.map((x) => x.rFim - x.r0);
  assert.ok(Math.max(...comps) > Math.min(...comps) * 1.4);
  const { geo } = plano();
  assert.equal(geo.raios.length, 10);
});

test("disco: palavras em linhas dentro do círculo, sem sobreposição, na ordem dada", () => {
  const w = larguras(60);
  const { slots, ok } = empacotarDisco(120, 9, 8, w);
  assert.ok(ok);
  const linhas = new Map();
  slots.forEach((s, i) => {
    assert.equal(s.w, w[i]);
    assert.ok(Math.hypot(Math.abs(s.u) + s.w / 2, Math.abs(s.v) + 4) <= 120 + 1, "palavra para fora do disco");
    if (!linhas.has(s.v)) linhas.set(s.v, []);
    linhas.get(s.v).push(i);
  });
  let ant = -Infinity;
  for (const [v, idx] of [...linhas].sort((a, b) => a[0] - b[0])) {
    assert.ok(Math.min(...idx) > ant, "ordem preservada de cima para baixo");
    ant = Math.max(...idx);
    for (let k = 1; k < idx.length; k++) assert.ok(slots[idx[k]].u - slots[idx[k]].w / 2 >= slots[idx[k - 1]].u + slots[idx[k - 1]].w / 2 - 1e-6, `linha ${v}`);
  }
});

test("disco: avisa quando as palavras não cabem", () => {
  const { ok, slots } = empacotarDisco(30, 9, 8, larguras(200));
  assert.equal(ok, false);
  assert.ok(slots.filter(Boolean).length < 200);
});

test("plano: o disco cabe na tela, leva as palavras que surgem primeiro e o resto vira estrela", () => {
  const { geo, rank, w, W, util } = plano(390, 700, 8, 600);
  assert.ok(geo.Rd <= Math.min(W, util) * 0.38 + 1e-6);
  const dentro = geo.membros.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  assert.ok(dentro.length > 40 && dentro.length < 600, `${dentro.length} no disco`);
  for (const i of dentro) assert.ok(rank[i] < dentro.length, "só as que surgem primeiro entram no disco");
  for (const i of dentro) assert.equal(geo.membros[i].w, w[i]);
  assert.ok(geo.membros.some((m) => m === null), "sobram estrelas");
});

test("plano: poucas palavras cabem todas num disco menor que o teto", () => {
  const { geo } = plano(1280, 700, 14, 150);
  assert.ok(geo.membros.every(Boolean));
  assert.ok(geo.Rd < 700 * 0.38);
});

test("plano: a ordem das linhas da forma é mantida no disco (cada palavra viaja pouco)", () => {
  const { geo } = plano(1280, 700, 12, 300);
  const idx = geo.membros.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  for (let k = 1; k < idx.length; k++) assert.ok(geo.membros[idx[k]].v >= geo.membros[idx[k - 1]].v - 1e-9);
});

test("fase do disco: o miolo sai primeiro, a borda por último; tudo pronto em s = 1", () => {
  assert.equal(faseDisco(0, 0, 100), 0);
  assert.equal(faseDisco(1, 100, 100), 1);
  assert.equal(faseDisco(1, 0, 100), 1);
  assert.ok(faseDisco(0.4, 10, 100) > faseDisco(0.4, 90, 100));
  for (let s = 0; s < 1; s += 0.05) assert.ok(faseDisco(s + 0.05, 50, 100) >= faseDisco(s, 50, 100));
});

test("posição: sem giro está no lugar; meia volta espelha em torno do centro; o ângulo fica em (-π, π]", () => {
  const { geo } = plano();
  const m = geo.membros.find(Boolean);
  const a = posicaoDisco(m, geo, 0), b = posicaoDisco(m, geo, Math.PI);
  assert.ok(Math.abs(a.x - (geo.cx + m.u)) < 1e-9 && Math.abs(a.y - (geo.cy + m.v)) < 1e-9);
  assert.ok(Math.abs(a.x + b.x - 2 * geo.cx) < 1e-9 && Math.abs(a.y + b.y - 2 * geo.cy) < 1e-9);
  assert.ok(Math.abs(Math.hypot(a.x - geo.cx, a.y - geo.cy) - Math.hypot(b.x - geo.cx, b.y - geo.cy)) < 1e-9);
  for (let x = -20; x < 20; x += 0.37) { const t = angulo(x); assert.ok(t > -Math.PI && t <= Math.PI); assert.ok(Math.abs(Math.cos(t) - Math.cos(x)) < 1e-9); }
});
