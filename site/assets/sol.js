// O sol: o bloco de palavras vira um círculo que gira (o disco) e ganha raios de luz (sem palavras).
// Referência: CodePen "Sun Ray Effect CSS", de abuzar. Lógica pura (sem DOM), testada em tools/sol.test.mjs;
// o desenho fica em app.js.
import { fracao } from "./core.js";

export const SOL_INICIO = Date.parse("2026-11-11T08:00:00-03:00"); // o bloco começa a virar círculo
export const SOL_FIM = Date.parse("2026-11-15T00:00:00-03:00"); // sol completo
export const VOLTA_S = 120; // o disco e os raios dão uma volta a cada 120 s (velocidade final), como no pen

// 0 antes de SOL_INICIO, 1 em SOL_FIM, linear no meio.
export const fracaoSol = (agora) => fracao(agora, SOL_INICIO, SOL_FIM);

const suave = (v) => { const p = Math.min(1, Math.max(0, v)); return p * p * (3 - 2 * p); };

// Velocidade de giro (rad/s) para o progresso s: parado no bloco, acelera enquanto vira círculo, estável a partir de 1.
export const velocidadeGiro = (s) => ((2 * Math.PI) / VOLTA_S) * suave(s);

// Os 10 raios do pen: ângulo (graus), comprimento e largura originais (px do pen; disco de 70 px).
export const RAIOS = [
  { ang: 180, comp: 170, larg: 30 },
  { ang: 220, comp: 100, larg: 8 },
  { ang: 250, comp: 170, larg: 50 },
  { ang: 305, comp: 120, larg: 14 },
  { ang: -15, comp: 140, larg: 30 },
  { ang: 30, comp: 90, larg: 50 },
  { ang: 70, comp: 180, larg: 10 },
  { ang: 100, comp: 120, larg: 30 },
  { ang: 120, comp: 80, larg: 10 },
  { ang: 150, comp: 190, larg: 23 },
];

// Raios de luz em torno de um disco de raio Rd: nascem sob a borda do disco e vão de ~1,6 a ~2,2 Rd.
export function raiosDe(Rd) {
  return RAIOS.map((r) => ({
    ang: (r.ang * Math.PI) / 180,
    r0: Rd * 0.85,
    rFim: Rd * (1.15 + r.comp / 190),
    larg: Rd * (0.05 + (0.35 * r.larg) / 50),
  }));
}

// Preenche um disco de raio Rd com as palavras, na ordem dada, em linhas horizontais (a corda de cada linha vira o
// comprimento dela). Cada linha é justificada; a folga extra tem teto (acima dele, centraliza). Devolve
// { slots, ok }: slots[k] = { u, v, w, r } (centro da palavra relativo ao centro do disco; r = distância ao centro) e
// ok = todas couberam. Linhas onde nem a primeira palavra cabe (pontas do disco) ficam vazias.
export function empacotarDisco(Rd, passo, f, larguras) {
  const folga = f * 0.4;
  const n = Math.floor((2 * Rd) / passo);
  const slots = new Array(larguras.length);
  let k = 0;
  for (let j = 0; j < n && k < larguras.length; j++) {
    const v = (j - (n - 1) / 2) * passo;
    const meia = Math.sqrt(Math.max(0, Rd * Rd - (Math.abs(v) + f * 0.5) ** 2));
    const L = 2 * meia - folga;
    if (L <= 0) continue;
    const ini = k;
    let usado = 0;
    while (k < larguras.length) {
      const add = larguras[k] + (k > ini ? folga : 0);
      if (usado + add > L) break;
      usado += add;
      k++;
    }
    if (k === ini) continue;
    const q = k - ini;
    let extra = q > 1 ? (L - usado) / (q - 1) : 0;
    if (extra > f * 1.2) extra = 0;
    let x = -meia + folga / 2 + (extra > 0 ? 0 : (L - usado) / 2);
    for (let i = ini; i < k; i++) {
      slots[i] = { u: x + larguras[i] / 2, v, w: larguras[i], r: Math.hypot(x + larguras[i] / 2, v) };
      x += larguras[i] + folga + extra;
    }
  }
  return { slots, ok: k >= larguras.length };
}

// Planeja o sol. `larguras[i]` é a largura da palavra i (na ordem das linhas da forma) e `rank[i]` a ordem em que ela
// surge (0 = primeira). O disco leva as palavras que surgem primeiro: todas, se couberem num disco de até 38% do
// lado menor; senão, as K primeiras que couberem (as demais viram "estrelas" e ficam vagando). Dentro do disco as
// palavras seguem a ordem das linhas da forma, como no bloco, para cada uma viajar pouco.
// Devolve { cx, cy, Rd, passo, raios, membros } com membros[i] = slot do disco ou null.
export function planejarSol(W, util, f, larguras, rank) {
  const N = larguras.length;
  const passo = f * 1.15;
  const teto = Math.min(W, util) * 0.38;
  const porRank = Array.from({ length: N }, (_, i) => i).sort((a, b) => rank[a] - rank[b]);
  const tenta = (Rd, K) => {
    const idx = porRank.slice(0, K).sort((a, b) => a - b);
    return { idx, ...empacotarDisco(Rd, passo, f, idx.map((i) => larguras[i])) };
  };
  let Rd = teto, melhor;
  const todas = tenta(teto, N);
  if (todas.ok) {
    let lo = f * 2, hi = teto;
    melhor = todas;
    for (let t = 0; t < 16; t++) {
      const mid = (lo + hi) / 2;
      const r = tenta(mid, N);
      if (r.ok) { hi = mid; melhor = r; } else lo = mid;
    }
    Rd = hi;
  } else {
    let lo = 0, hi = N;
    melhor = tenta(teto, 0);
    for (let t = 0; t < 14 && lo < hi; t++) {
      const mid = Math.ceil((lo + hi) / 2);
      const r = tenta(teto, mid);
      if (r.ok) { lo = mid; melhor = r; } else hi = mid - 1;
    }
  }
  const membros = new Array(N).fill(null);
  melhor.idx.forEach((i, k) => { if (melhor.slots[k]) membros[i] = melhor.slots[k]; });
  return { cx: W / 2, cy: util / 2, Rd, passo, raios: raiosDe(Rd), membros };
}

// Quanto da viagem bloco → disco a palavra já fez (0..1): as do miolo saem primeiro e as da borda por último,
// de modo que o círculo se fecha de dentro para fora; tudo termina em s = 1.
export const faseDisco = (s, r, Rd) => suave((s - 0.5 * Math.min(1, r / Rd)) / 0.5);

// Posição do CENTRO da palavra quando o disco girou `rot` radianos.
export function posicaoDisco(slot, geo, rot) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return { x: geo.cx + slot.u * c - slot.v * sn, y: geo.cy + slot.u * sn + slot.v * c };
}

// Ângulo equivalente em (-π, π].
export const angulo = (a) => {
  const t = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return t === -Math.PI ? Math.PI : t;
};
