import { ALVO, JUNTOS_DESDE, fracao, curva, ordem, embaralhar, encaixadas, partes } from "./core.js";
import { RUIDO } from "./ruido.js";
import { decifrar } from "./cripto.js";

const SEED_PALAVRAS = 4;   // ordem das palavras ao longo da forma
const SEED_ENCAIXE = 22;   // ordem em que as palavras se encaixam
const ESCALA_FORMA = 0.65; // fração da área útil ocupada pelo desenho
const FONTE_MAX = 28;
const FADE_MS = 4000;      // sumiço do ruído em ALVO

// ?data=2026-11-10T12:00:00-03:00 simula outra data (o tempo segue correndo a partir dela).
const simulada = Date.parse(new URLSearchParams(location.search).get("data") ?? "");
const deslocamento = Number.isNaN(simulada) ? 0 : simulada - Date.now();
const agora = () => Date.now() + deslocamento;

const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const css = getComputedStyle(document.documentElement);
const cor = (n) => css.getPropertyValue(n).trim();

let W = 0, H = 0, RODAPE = 120, fonteForma = 12, fonteRuido = 9; // RODAPE: altura medida do relógio (px)
let palavras = [];    // palavras pessoais (vazio sem chave: nada de forma)
let final = "";       // palavra final; só existe depois de decifrar
let ruido = [];       // { texto, base, fase, periodo }
let forma = [];       // { texto, slot, base, fase, periodo, rank, p }
let rank = [];

// ---------- conteúdo pessoal (cifrado; a chave vem no #fragmento do link) ----------
// Sem chave válida não há forma, palavra final nem encaixe: só ruído e relógio.
async function carregarPessoais() {
  const chave = location.hash.slice(1);
  if (!chave) return;
  try {
    const res = await fetch("assets/pessoais.enc.json", { cache: "no-cache" });
    if (!res.ok) return;
    const pacote = await decifrar(await res.json(), chave);
    if (pacote && typeof pacote.palavra === "string" && Array.isArray(pacote.palavras) && pacote.palavras.length) {
      final = pacote.palavra;
      palavras = ordem(pacote.palavras.length, SEED_PALAVRAS).map((i) => pacote.palavras[i]);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", final);
    }
  } catch {
    /* sem rede, arquivo ausente ou chave errada: só ruído */
  }
}

const temForma = () => final !== "" && palavras.length > 0;

// ---------- forma (palavra final) ----------
function mascara() {
  const letras = [...final];
  const meio = Math.ceil(letras.length / 2);
  const linhas = W < H && letras.length > 3 ? [letras.slice(0, meio).join(""), letras.slice(meio).join("")] : [final];
  const util = H - RODAPE;
  const area = { w: W * ESCALA_FORMA, h: util * ESCALA_FORMA };
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true });
  const familia = cor("--font-body");
  let tam = 200;
  c.font = `900 ${tam}px ${familia}`;
  const largura = Math.max(...linhas.map((l) => c.measureText(l).width));
  tam = Math.min(tam * (area.w / largura), area.h / linhas.length);
  c.font = `900 ${tam}px ${familia}`;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = c.strokeStyle = "#000";
  c.lineJoin = "round";
  c.lineWidth = tam * 0.09; // engrossa as letras para caberem mais palavras
  const alturaTotal = tam * 0.82 * linhas.length + tam * 0.18 * (linhas.length - 1);
  let y = (util - alturaTotal) / 2 + tam * 0.82 + tam * 0.1;
  for (const l of linhas) {
    c.fillText(l, W / 2, y);
    c.strokeText(l, W / 2, y);
    y += tam;
  }
  const px = c.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3] > 128 ? 1 : 0;
  return m;
}

function cabe(m, x, y, w, h) {
  const x0 = Math.floor(x), x1 = Math.min(W - 1, Math.ceil(x + w));
  if (x0 < 0 || x1 >= W) return false;
  for (const yy of [y - h / 2, y, y + h / 2]) {
    const row = Math.floor(yy) * W;
    if (yy < 0 || yy >= H) return false;
    for (let xx = x0; xx <= x1; xx += 2) if (!m[row + xx]) return false;
    if (!m[row + x1]) return false;
  }
  return true;
}

// Preenche toda a forma, repetindo as palavras em ciclo. Devolve [{ i, x, y }].
function preencher(m, f) {
  ctx.font = `${f}px ${cor("--font-body")}`;
  const larguras = palavras.map((p) => ctx.measureText(p).width);
  const folga = f * 0.4;
  const slots = [];
  const passo = f * 1.15;
  let k = 0;
  for (let y = passo; y < H - RODAPE; y += passo) {
    let x = 0;
    while (x < W) {
      const i = k % palavras.length;
      if (cabe(m, x, y, larguras[i], f * 0.6)) {
        slots.push({ i, x, y });
        x += larguras[i] + folga;
        k++;
      } else x += 2;
    }
  }
  return slots;
}

// Maior fonte que ainda usa todas as palavras ao menos uma vez.
function montar() {
  const dpr = devicePixelRatio || 1;
  W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
  RODAPE = (document.getElementById("relogio").offsetHeight || 100) + 16;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let slots = [];
  if (temForma()) {
    const m = mascara();
    let lo = 3, hi = FONTE_MAX;
    slots = preencher(m, lo);
    for (let n = 0; n < 9; n++) {
      const mid = (lo + hi) / 2;
      const s = preencher(m, mid);
      if (s.length >= palavras.length) { lo = mid; slots = s; } else hi = mid;
    }
    fonteForma = lo;
  }
  fonteRuido = Math.max(8, Math.min(11, W / 90 + 4));

  const rnd = (a) => Math.abs((Math.sin(a * 127.1) * 43758.5453) % 1);
  const antigos = forma;
  rank = new Array(slots.length);
  ordem(slots.length, SEED_ENCAIXE).forEach((idx, r) => (rank[idx] = r));
  forma = slots.map((s, i) => ({
    texto: palavras[s.i],
    slot: { x: s.x, y: s.y },
    base: { x: rnd(i + 1) * W, y: rnd(i + 77) * (H - RODAPE) },
    fase: rnd(i + 5) * 6.28,
    periodo: 1800 + rnd(i + 9) * 2200,
    p: antigos[i]?.p ?? null,
  }));
  // Ruído em grade com jitter: cobre a tela toda sem empilhar palavras.
  let cw = fonteRuido * 3, ch = fonteRuido * 2;
  const f = Math.max(1, Math.sqrt((W * H) / (cw * ch * RUIDO.length)));
  cw *= f; ch *= f;
  const cols = Math.max(1, Math.floor(W / cw)), rows = Math.max(1, Math.floor(H / ch));
  const celulas = Math.min(RUIDO.length, cols * rows);
  cw = W / cols; ch = H / rows;
  const palavrasRuido = ordem(RUIDO.length, 9);
  ruido = ordem(cols * rows, 9).slice(0, celulas).map((c, i) => ({
    texto: RUIDO[palavrasRuido[i]],
    base: { x: (c % cols + 0.5 + (rnd(i + 301) - 0.5) * 0.5) * cw, y: (Math.floor(c / cols) + 0.5 + (rnd(i + 677) - 0.5) * 0.5) * ch },
    ax: cw * 0.3, ay: ch * 0.3,
    fase: rnd(i + 15) * 6.28,
    periodo: 3000 + rnd(i + 19) * 4000,
  }));
}

// ---------- quadro ----------
let ultimo = performance.now();

function quadro(t) {
  const dt = Math.min(0.1, (t - ultimo) / 1000);
  ultimo = t;
  const n = agora();
  const feitas = encaixadas(forma.length, curva(fracao(n)));
  const k = reduzido ? 0 : t / 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "middle";

  // Ruído: some em ALVO e não volta. Sem forma para revelar, ele fica.
  const vivo = !temForma() ? 1 : reduzido ? (n < ALVO ? 1 : 0) : 1 - Math.min(1, Math.max(0, (n - ALVO) / FADE_MS));
  if (vivo > 0) {
    ctx.font = `${fonteRuido}px ${cor("--font-body")}`;
    ctx.fillStyle = cor("--color-ruido");
    ctx.globalAlpha = 0.55 * vivo;
    ctx.textAlign = "center";
    for (const r of ruido) {
      const x = r.base.x + Math.sin(k * 0.45 + r.fase) * r.ax;
      const y = r.base.y + Math.cos(k * 0.37 + r.fase * 1.3) * r.ay;
      ctx.globalAlpha = (y > H - RODAPE ? 0.3 : 0.55) * vivo; // mais discreto atrás do relógio
      ctx.fillText(r.texto, x, y);
    }
    ctx.textAlign = "left";
  }

  // Palavras da forma.
  ctx.font = `${fonteForma}px ${cor("--font-body")}`;
  forma.forEach((it, i) => {
    const alvo = rank[i] < feitas ? 1 : 0;
    if (it.p === null) it.p = alvo; // primeira vez: não anima o que já estava encaixado
    else it.p += Math.sign(alvo - it.p) * Math.min(Math.abs(alvo - it.p), dt / 1.8);

    const e = it.p * it.p * (3 - 2 * it.p);
    // soltas: vagam pela tela toda; ao encaixar, vão para o lugar
    const fx = it.base.x + Math.sin(k * 0.22 + it.fase) * W * 0.28 + Math.sin(k * 0.61 + it.fase * 2) * 30;
    const fy = it.base.y + Math.cos(k * 0.19 + it.fase * 1.3) * (H - RODAPE) * 0.28 + Math.cos(k * 0.53 + it.fase) * 24;
    const x = Math.min(W - 10, Math.max(10, fx)) * (1 - e) + it.slot.x * e;
    const y = Math.min(H - RODAPE, Math.max(10, fy)) * (1 - e) + it.slot.y * e;

    let texto = it.texto;
    if (!reduzido && it.p < 1) {
      const emTransito = it.p > 0.02;
      const ciclo = ((t + it.fase * 900) % it.periodo) / it.periodo;
      if (emTransito || ciclo < 0.7) texto = embaralhar(it.texto, Math.floor(t / (emTransito ? 90 : 160)) * 977 + ((it.fase * 1000) | 0));
    }
    ctx.fillStyle = cor("--color-accent");
    ctx.globalAlpha = 0.45 + 0.55 * e;
    ctx.fillText(texto, x, y);
  });
  ctx.globalAlpha = 1;

  relogio(n);
  requestAnimationFrame(quadro);
}

// ---------- relógio ----------
const nos = [];
function relogio(n) {
  const antes = n < ALVO;
  document.getElementById("rotulo").textContent = antes ? "Falta(m)" : "Juntos há";
  const el = document.getElementById("clock");
  if (!nos.length) {
    ["dias", "horas", "min", "seg"].forEach((r) => {
      const u = document.createElement("div");
      u.className = "unit";
      const v = document.createElement("span"); v.className = "value";
      const l = document.createElement("span"); l.className = "label"; l.textContent = r;
      u.append(v, l);
      el.append(u);
      nos.push(v);
    });
  }
  partes(antes ? ALVO - n : n - JUNTOS_DESDE).forEach((v, i) => (nos[i].textContent = String(v).padStart(2, "0")));
}

let redim;
addEventListener("resize", () => { clearTimeout(redim); redim = setTimeout(montar, 150); });
Promise.all([carregarPessoais(), document.fonts?.load(`1em ${cor("--font-display")}`).catch(() => {}), document.fonts?.ready]).then(() => { montar(); requestAnimationFrame(quadro); });
