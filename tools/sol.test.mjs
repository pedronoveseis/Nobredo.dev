import test from "node:test";
import assert from "node:assert/strict";
import { SOL_INICIO, SOL_FIM, VOLTA_MS, RAIOS, fracaoSol, giro, geometriaSol, preencherSol, ordemEntrada, posicaoSol } from "../site/assets/sol.js";
import { ALVO, ordem, encaixadas } from "../site/assets/core.js";

const larguras = (n) => Array.from({ length: n }, (_, i) => 22 + ((i * 7) % 5) * 6);
const monta = (W = 390, util = 700, f = 8, n = 600) => {
  const geo = geometriaSol(W, util, f);
  const w = larguras(n);
  return { geo, w, slots: preencherSol(geo, w, ordem(n, 4), f), f };
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

test("giro: uma volta em 120 s, sempre entre 0 e 2π", () => {
  assert.equal(giro(0), 0);
  assert.ok(Math.abs(giro(VOLTA_MS / 4) - Math.PI / 2) < 1e-9);
  assert.ok(giro(VOLTA_MS - 1) < 2 * Math.PI);
  assert.equal(giro(VOLTA_MS), 0);
});

test("geometria: 10 raios do pen, cabem na área, nascem fora do disco", () => {
  assert.equal(RAIOS.length, 10);
  const { geo } = monta();
  assert.equal(geo.raios.length, 10);
  for (const r of geo.raios) {
    assert.ok(r.r0 > geo.Rd && r.rFim > r.r0 && r.rFim <= 390 * 0.5 + 1e-6);
    assert.ok(r.faixas >= 1 && r.faixas <= 3);
  }
  const comps = geo.raios.map((r) => r.rFim - r.r0);
  assert.ok(Math.max(...comps) > Math.min(...comps) * 1.5, "raios de comprimentos bem diferentes");
});

test("preenchimento: cada palavra no máximo uma vez, disco e raios usados, tudo dentro do alcance", () => {
  const { geo, slots, w } = monta();
  assert.ok(slots.length > 40);
  assert.equal(new Set(slots.map((s) => s.i)).size, slots.length);
  assert.ok(slots.some((s) => s.tipo === "disco") && slots.some((s) => s.tipo === "raio"));
  for (const s of slots) {
    assert.equal(s.w, w[s.i]);
    const p = posicaoSol(s, geo, 1.234);
    const d = Math.hypot(p.x - geo.cx, p.y - geo.cy);
    assert.ok(d <= Math.min(390, 700) * 0.5 + 1e-6, `fora do alcance: ${d}`);
  }
  for (const k of new Set(slots.filter((s) => s.tipo === "raio").map((s) => s.raio))) assert.ok(k >= 0 && k < 10);
});

test("preenchimento: palavras de uma mesma faixa não se sobrepõem", () => {
  const { slots } = monta(1280, 700, 14);
  const faixas = new Map();
  for (const s of slots) {
    const chave = s.tipo === "disco" ? `d${s.v.toFixed(3)}` : `r${s.raio}:${s.v.toFixed(3)}`;
    if (!faixas.has(chave)) faixas.set(chave, []);
    faixas.get(chave).push(s);
  }
  for (const [, lista] of faixas) {
    lista.sort((a, b) => a.u - b.u);
    for (let k = 1; k < lista.length; k++) assert.ok(lista[k].u - lista[k].w / 2 >= lista[k - 1].u + lista[k - 1].w / 2 - 1e-6);
  }
});

test("palavras do disco ficam dentro do círculo", () => {
  const { geo, slots } = monta(1280, 700, 14);
  for (const s of slots.filter((x) => x.tipo === "disco")) {
    assert.ok(Math.abs(s.u) + s.w / 2 <= geo.Rd + 1e-6, "ponta da palavra para fora do disco");
    assert.ok(Math.hypot(Math.abs(s.u) + s.w / 2, Math.abs(s.v) + 7) <= geo.Rd + 1, "canto para fora do disco");
  }
});

test("poucas palavras: usa só as que existem, sem repetir", () => {
  const geo = geometriaSol(390, 700, 8);
  const w = larguras(15);
  const slots = preencherSol(geo, w, ordem(15, 1), 8);
  assert.ok(slots.length <= 15 && slots.length > 0);
  assert.equal(new Set(slots.map((s) => s.i)).size, slots.length);
});

test("ordem de entrada: do miolo para fora e determinística", () => {
  const { geo, slots } = monta();
  const rank = ordemEntrada(slots, geo, 7);
  assert.deepEqual(rank, ordemEntrada(slots, geo, 7));
  assert.equal(new Set(rank).size, slots.length);
  const porRank = [];
  rank.forEach((r, j) => (porRank[r] = slots[j]));
  const metade = porRank.slice(0, Math.floor(slots.length / 2)).reduce((a, s) => a + s.r, 0) / Math.floor(slots.length / 2);
  const resto = porRank.slice(Math.floor(slots.length / 2)).reduce((a, s) => a + s.r, 0) / (slots.length - Math.floor(slots.length / 2));
  assert.ok(metade < resto);
  // o disco enche antes dos raios: quase todas as palavras do disco entram antes de quase todas as dos raios
  const disco = slots.filter((s) => s.tipo === "disco").length;
  const mediana = (tipo) => { const r = slots.map((s, j) => (s.tipo === tipo ? rank[j] : null)).filter((x) => x !== null).sort((a, b) => a - b); return r[Math.floor(r.length / 2)]; };
  assert.ok(mediana("disco") < disco && mediana("raio") > disco);
});

test("posição: o disco não gira; o raio gira e o texto nunca fica de cabeça para baixo", () => {
  const { geo, slots } = monta();
  const d = slots.find((s) => s.tipo === "disco");
  assert.deepEqual(posicaoSol(d, geo, 0), posicaoSol(d, geo, 2));
  const r = slots.find((s) => s.tipo === "raio");
  const a = posicaoSol(r, geo, 0), b = posicaoSol(r, geo, Math.PI);
  assert.ok(Math.abs(a.x + b.x - 2 * geo.cx) < 1e-6 && Math.abs(a.y + b.y - 2 * geo.cy) < 1e-6, "meia volta espelha em torno do centro");
  for (let rot = 0; rot < 2 * Math.PI; rot += 0.1) {
    for (const s of slots.filter((x) => x.tipo === "raio")) {
      const { ang } = posicaoSol(s, geo, rot);
      assert.ok(Math.abs(ang) <= Math.PI / 2 + 1e-9, `ângulo ${ang}`);
    }
  }
});
