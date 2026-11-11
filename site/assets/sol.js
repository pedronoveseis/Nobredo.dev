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

// Ângulo em [-π/2, 3π/2): o topo do anel é -π/2 e o sentido é horário na tela (y para baixo).
const norma = (x) => ((((x + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI / 2;

// Preenche o disco de raio Rd com anéis concêntricos de palavras (o desenho do CodePen "Circular Maze Generator"),
// de fora para dentro, na ordem dada. Cada anel é um laço fechado: leva palavras enquanto couberem (largura + folga
// mínima) e distribui a folga extra por igual; a folga tem teto (acima dele, o anel fica só com o trecho preenchido).
// O miolo (raio < 0,2 Rd) fica livre, para o núcleo brilhante do sol. Anéis onde nem a primeira palavra cabe são
// pulados. Devolve { slots, ok }: slots[k] = { r, th, w, anel } (r = raio do anel; th = ângulo do CENTRO da palavra)
// e ok = todas couberam.
export function empacotarAneis(Rd, f, larguras) {
  const folgaMin = f * 0.4, folgaMax = f * 1.6, passo = f * 1.3, rMin = Rd * 0.2;
  const slots = new Array(larguras.length);
  let k = 0;
  for (let j = 0; k < larguras.length; j++) {
    const r = Rd - f * 0.7 - j * passo;
    if (r < rMin) break;
    const C = 2 * Math.PI * r;
    const ini = k;
    let soma = 0;
    while (k < larguras.length && soma + larguras[k] + (k - ini + 1) * folgaMin <= C) { soma += larguras[k]; k++; }
    const n = k - ini;
    if (n === 0) continue;
    const folga = Math.min(folgaMax, (C - soma) / n);
    const th0 = -Math.PI / 2 + j * 0.7; // cada anel começa num ponto diferente: nada fica alinhado em raio
    let s = 0;
    for (let i = ini; i < k; i++) {
      slots[i] = { r, th: norma(th0 + (s + larguras[i] / 2) / r), w: larguras[i], anel: j };
      s += larguras[i] + folga;
    }
  }
  return { slots, ok: k >= larguras.length };
}

// Planeja o sol. `larguras[i]` é a largura da palavra i (na ordem das linhas da forma) e `rank[i]` a ordem em que ela
// surge (0 = primeira). O disco leva as palavras que surgem primeiro: todas, se couberem num disco de até 38% do
// lado menor; senão, as K primeiras que couberem (as demais viram "estrelas" e ficam vagando). Os anéis são
// preenchidos na ordem das linhas da forma (de fora para dentro).
// Devolve { cx, cy, Rd, rMin, raios, membros } com membros[i] = slot do disco ou null.
export function planejarSol(W, util, f, larguras, rank) {
  const N = larguras.length;
  const teto = Math.min(W, util) * 0.38;
  const porRank = Array.from({ length: N }, (_, i) => i).sort((a, b) => rank[a] - rank[b]);
  const tenta = (Rd, K) => {
    const idx = porRank.slice(0, K).sort((a, b) => a - b);
    return { idx, ...empacotarAneis(Rd, f, idx.map((i) => larguras[i])) };
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
  return { cx: W / 2, cy: util / 2, Rd, rMin: Rd * 0.2, raios: raiosDe(Rd), membros };
}

// Quanto da viagem bloco → disco a palavra já fez (0..1): as do miolo saem primeiro e as da borda por último,
// de modo que o círculo se fecha de dentro para fora; tudo termina em s = 1.
export const faseDisco = (s, r, Rd) => suave((s - 0.5 * Math.min(1, r / Rd)) / 0.5);

// Posição do CENTRO da palavra quando o disco girou `rot` radianos (todos os anéis giram juntos, como no pen).
export function posicaoDisco(slot, geo, rot) {
  const a = slot.th + rot;
  return { x: geo.cx + slot.r * Math.cos(a), y: geo.cy + slot.r * Math.sin(a) };
}

// Ângulo do texto: tangente ao anel, com o topo das letras para fora (texto de baixo fica de cabeça para baixo,
// como texto em anel). Contínuo (não dá a volta), por isso o app o multiplica pela fase sem pulos.
export const anguloDaPalavra = (slot, rot) => slot.th + rot + Math.PI / 2;

// Letras de uma palavra dobradas num arco de curvatura kappa (1/r no anel; 0 = reta). `avancos[k]` é a largura da
// letra k. Devolve, no referencial da palavra (x ao longo da tangente, y para o centro do anel), { lx, ly, a } de cada
// letra: posição do centro dela e quanto ela se inclina.
export function letrasNoArco(avancos, kappa) {
  const total = avancos.reduce((a, b) => a + b, 0);
  let cum = 0;
  return avancos.map((w) => {
    const sk = cum + w / 2 - total / 2;
    cum += w;
    if (Math.abs(kappa) < 1e-6) return { lx: sk, ly: 0, a: 0 };
    const psi = sk * kappa;
    return { lx: Math.sin(psi) / kappa, ly: (1 - Math.cos(psi)) / kappa, a: psi };
  });
}

// Ângulo equivalente em (-π, π].
export const angulo = (a) => {
  const t = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return t === -Math.PI ? Math.PI : t;
};
