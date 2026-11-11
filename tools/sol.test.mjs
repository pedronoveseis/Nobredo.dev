import test from "node:test";
import assert from "node:assert/strict";
import { SOL_INICIO, SOL_FIM, VOLTA_S, RAIOS, fracaoSol, velocidadeGiro, raiosDe, empacotarAneis, planejarSol, faseDisco, posicaoDisco, anguloDaPalavra, letrasNoArco, angulo } from "../site/assets/sol.js";
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

test("anéis: palavras sobre círculos concêntricos dentro do disco, sem sobreposição, na ordem dada", () => {
  const w = larguras(80);
  const { slots, ok } = empacotarAneis(120, 8, w);
  assert.ok(ok);
  const aneis = new Map();
  slots.forEach((s, i) => {
    assert.equal(s.w, w[i]);
    assert.ok(s.r + 4 <= 120 + 1e-6, "anel para fora do disco");
    assert.ok(s.r >= 120 * 0.2 - 1e-6, "invade o miolo livre");
    if (!aneis.has(s.anel)) aneis.set(s.anel, []);
    aneis.get(s.anel).push(i);
  });
  assert.ok(aneis.size >= 3, "vários anéis");
  // o raio de cada anel é um só e diminui de fora para dentro; a ordem das palavras segue anel a anel
  let rAnt = Infinity, iAnt = -1;
  for (const [, idx] of [...aneis].sort((a, b) => a[0] - b[0])) {
    const r = slots[idx[0]].r;
    assert.ok(idx.every((i) => slots[i].r === r));
    assert.ok(r < rAnt);
    assert.ok(Math.min(...idx) > iAnt);
    rAnt = r; iAnt = Math.max(...idx);
    // dentro do anel: a distância em arco entre vizinhas cabe as duas metades
    const ord = [...idx].sort((a, b) => slots[a].th - slots[b].th);
    for (let k = 1; k < ord.length; k++) {
      const d = (slots[ord[k]].th - slots[ord[k - 1]].th) * r;
      assert.ok(d >= (slots[ord[k]].w + slots[ord[k - 1]].w) / 2 - 1e-6, `anel ${slots[idx[0]].anel}: sobreposição`);
    }
  }
});

test("anéis: um anel cheio é um laço fechado (o último e o primeiro também não se sobrepõem)", () => {
  const w = larguras(500);
  const { slots } = empacotarAneis(150, 8, w);
  const externo = slots.filter((s) => s && s.anel === 0);
  const r = externo[0].r;
  const ord = [...externo].sort((a, b) => a.th - b.th);
  const volta = (ord[0].th + 2 * Math.PI - ord[ord.length - 1].th) * r;
  assert.ok(volta >= (ord[0].w + ord[ord.length - 1].w) / 2 - 1e-6);
  for (const s of externo) assert.ok(s.th >= -Math.PI / 2 && s.th < (3 * Math.PI) / 2);
});

test("anéis: avisa quando as palavras não cabem", () => {
  const { ok, slots } = empacotarAneis(40, 8, larguras(200));
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

test("plano: as palavras do disco seguem a ordem das linhas da forma, anel a anel, de fora para dentro", () => {
  const { geo } = plano(1280, 700, 12, 300);
  const idx = geo.membros.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  for (let k = 1; k < idx.length; k++) assert.ok(geo.membros[idx[k]].r <= geo.membros[idx[k - 1]].r + 1e-9);
});

test("fase do disco: o miolo sai primeiro, a borda por último; tudo pronto em s = 1", () => {
  assert.equal(faseDisco(0, 0, 100), 0);
  assert.equal(faseDisco(1, 100, 100), 1);
  assert.equal(faseDisco(1, 0, 100), 1);
  assert.ok(faseDisco(0.4, 10, 100) > faseDisco(0.4, 90, 100));
  for (let s = 0; s < 1; s += 0.05) assert.ok(faseDisco(s + 0.05, 50, 100) >= faseDisco(s, 50, 100));
});

test("posição: sem giro está no anel; todos giram juntos (a distância ao centro não muda); o ângulo fica em (-π, π]", () => {
  const { geo } = plano();
  const m = geo.membros.find(Boolean);
  const a = posicaoDisco(m, geo, 0), b = posicaoDisco(m, geo, 2.1);
  assert.ok(Math.abs(Math.hypot(a.x - geo.cx, a.y - geo.cy) - m.r) < 1e-9);
  assert.ok(Math.abs(Math.hypot(b.x - geo.cx, b.y - geo.cy) - m.r) < 1e-9);
  const c = posicaoDisco(m, geo, Math.PI);
  assert.ok(Math.abs(a.x + c.x - 2 * geo.cx) < 1e-9 && Math.abs(a.y + c.y - 2 * geo.cy) < 1e-9);
  for (let x = -20; x < 20; x += 0.37) { const t = angulo(x); assert.ok(t > -Math.PI && t <= Math.PI); assert.ok(Math.abs(Math.cos(t) - Math.cos(x)) < 1e-9); }
});

test("texto: tangente ao anel (topo das letras para fora)", () => {
  const geo = { cx: 0, cy: 0 };
  const topo = { r: 100, th: -Math.PI / 2 }; // topo do disco: texto em pé
  assert.ok(Math.abs(anguloDaPalavra(topo, 0)) < 1e-9);
  const direita = { r: 100, th: 0 }; // lado direito: texto na vertical, lido de cima para baixo
  assert.ok(Math.abs(Math.cos(anguloDaPalavra(direita, 0))) < 1e-9);
  const baixo = { r: 100, th: Math.PI / 2 };
  assert.ok(Math.abs(Math.abs(angulo(anguloDaPalavra(baixo, 0))) - Math.PI) < 1e-9, "embaixo, de cabeça para baixo");
  const p = posicaoDisco(direita, geo, 0);
  assert.ok(Math.abs(p.x - 100) < 1e-9 && Math.abs(p.y) < 1e-9);
});

test("letras no arco: reta sem curvatura; com curvatura ficam sobre o círculo e a palavra se dobra para o centro", () => {
  const av = [5, 6, 5, 7, 6];
  const reta = letrasNoArco(av, 0);
  assert.ok(reta.every((l) => l.ly === 0 && l.a === 0));
  assert.ok(Math.abs((reta[0].lx - av[0] / 2) + (reta[4].lx + av[4] / 2)) < 1e-9, "centrada");
  const r = 40, arco = letrasNoArco(av, 1 / r);
  for (const l of arco) assert.ok(Math.abs(Math.hypot(l.lx, l.ly - r) - r) < 1e-9, "fora do círculo");
  assert.ok(arco[0].ly > 0 && arco[4].ly > 0 && arco[2].ly < arco[0].ly, "as pontas descem em direção ao centro");
  assert.ok(arco[0].a < 0 && arco[4].a > 0);
  // curvaturas pequenas se aproximam da reta
  const quase = letrasNoArco(av, 1e-4);
  quase.forEach((l, i) => assert.ok(Math.abs(l.lx - reta[i].lx) < 1e-3 && Math.abs(l.ly) < 1e-2));
});

test("ritmo: às 12h36 de 11/11 (5%) o anel interno já saiu do lugar e o halo já aparece", () => {
  const s = fracaoSol(Date.parse("2026-11-11T12:36:00-03:00"));
  assert.ok(s > 0.05 && s < 0.06);
  assert.ok(faseDisco(s, 20, 100) > 0.05, "anel interno ainda parado");
  assert.ok(faseDisco(s, 100, 100) === 0, "anel externo ainda espera");
  assert.ok(faseDisco(0, 20, 100) === 0 && faseDisco(0.01, 20, 100) > 0.01, "começa em s = 0");
  assert.ok(velocidadeGiro(s) > 0.05 * ((2 * Math.PI) / VOLTA_S), "giro ainda imperceptível");
});

test("ritmo: de 11/11 08h a 15/11 00h algo novo se move todo dia, de dentro para fora, e tudo termina em 15/11", () => {
  const DIA = 86400000;
  const soma = (t) => [20, 40, 60, 80, 100].reduce((a, r) => a + faseDisco(fracaoSol(t), r, 100), 0);
  for (let t = SOL_INICIO; t + DIA <= SOL_FIM; t += DIA) assert.ok(soma(t + DIA) - soma(t) > 0.3, `dia ${new Date(t).toISOString()}`);
  assert.equal(soma(SOL_FIM), 5);
  // o anel interno sempre está à frente do externo
  for (let s = 0; s <= 1; s += 0.05) for (const [a, b] of [[20, 60], [60, 100]]) assert.ok(faseDisco(s, a, 100) >= faseDisco(s, b, 100) - 1e-12);
  // monótona e pousa devagar: a velocidade final tende a zero
  for (let s = 0; s < 1; s += 0.02) assert.ok(faseDisco(s + 0.02, 60, 100) >= faseDisco(s, 60, 100));
  assert.ok(faseDisco(1, 60, 100) - faseDisco(0.98, 60, 100) < 0.01);
});

test("giro: linear até a metade do caminho e constante depois", () => {
  const w = (2 * Math.PI) / VOLTA_S;
  assert.ok(Math.abs(velocidadeGiro(0.25) - w / 2) < 1e-12);
  assert.ok(Math.abs(velocidadeGiro(0.5) - w) < 1e-12);
  assert.ok(Math.abs(velocidadeGiro(0.8) - w) < 1e-12);
});
