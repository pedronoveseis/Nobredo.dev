import { ALVO, JUNTOS_DESDE, fracao, curva, ordem, proximaPalavra, semAnagramas, embaralhar, encaixadas, partes, empacotar, linhasBloco } from "./core.js";
import { RUIDO as TODO_RUIDO } from "./ruido.js";
const RUIDO = semAnagramas(TODO_RUIDO); // sem anagramas: nada repete nem colide ao embaralhar
import { PALETAS, ESCALA_NUVEM, misturar, planejarNuvens, atribuir, posicao, desenharNuvem, desenharSombra, desenharChuva } from "./nuvens.js";
import { fracaoSol, giro, geometriaSol, preencherSol, ordemEntrada, posicaoSol } from "./sol.js";
import { ATUALIZAR_MS, neutro, nuvensParaCobertura, nuvensComChuva, fatorVento, lerSimulado, carregarTempo, buscarTempo, lerBruto, normalizarTempo, URL_TEMPO } from "./tempo.js";

const SEED_PALAVRAS = 4;   // ordem das palavras ao longo da forma
const SEED_ENCAIXE = 22;   // ordem em que as palavras se encaixam
const ESCALA_FORMA = 0.65; // fração da área útil ocupada pelo desenho
const FONTE_MAX = 28;
const FATOR_FONTE = 0.7;  // a forma usa essa fração da maior fonte possível: mais slots, pontos menores
const FONTE_MIN = 6.5;    // piso (px) para não ficar ilegível no celular
const ONDA_MS = 6000;     // a transformação em VOCE varre a tela da esquerda para a direita nesse tempo
const ESPERA_MS = 1500;   // numa primeira visita depois de ALVO, o bloco aparece e só então começa a onda
const CHAVE = "nobredo-viu-transformacao";
const VOO_MS = 2500;      // duração do deslocamento de cada palavra, do bloco ao lugar na forma
const SEED_SOL = 31;      // quais palavras vão para o sol e a ordem em que entram
const ALFA_ESTRELA = 0.22; // palavras que não cabem no sol ficam vagando fracas ao redor
const CHAVE_NUVENS = "nobredo-viu-nuvens";
// Intro das nuvens (primeira visita), em ms: o ruído voa até as nuvens, elas estufam, a deriva começa.
const VOO_RUIDO_MS = 1800, INTRO_PUFF_MS = 2500, INTRO_PUFF_DUR = 1500, INTRO_PALAVRA_MS = 3600, INTRO_DERIVA_MS = 5000, INTRO_MS = 6500;
const LENTO = 1.5; // o intro das nuvens dura 50% mais: o relógio do intro corre a 1/LENTO (as constantes acima são em tempo "normal")
// FIM_NUVENS: as nuvens saem antes de 21/11; o momento e o jeito serão definidos depois.

// ?data=2026-11-10T12:00:00-03:00 simula outra data (o tempo segue correndo a partir dela).
const simulada = Date.parse(new URLSearchParams(location.search).get("data") ?? "");
const deslocamento = Number.isNaN(simulada) ? 0 : simulada - Date.now();
const agora = () => Date.now() + deslocamento;

// Quando a transformação em VOCE começa. Antes de ALVO: em ALVO. Depois de ALVO: na primeira visita (logo
// depois de abrir); nas seguintes (marca no localStorage), ou se ele estiver bloqueado, já está pronto.
const lerMarca = () => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return true; } };
const gravarMarca = () => { try { localStorage.setItem(CHAVE, "1"); } catch { /* sem armazenamento: ok */ } };
const lerMarcaNuvens = () => { try { return localStorage.getItem(CHAVE_NUVENS) === "1"; } catch { return true; } };
const gravarMarcaNuvens = () => { try { localStorage.setItem(CHAVE_NUVENS, "1"); } catch { /* ok */ } };
if (new URLSearchParams(location.search).has("reset")) { try { localStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE_NUVENS); } catch { /* ok */ } }
const PRONTA = -Infinity;
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const introNuvens = !reduzido && !lerMarcaNuvens(); // primeira visita: o ruído voa e forma as nuvens
let marcadoNuvens = !introNuvens;
let inicioTransf = agora() < ALVO ? ALVO : reduzido || lerMarca() ? PRONTA : agora() + ESPERA_MS + (introNuvens ? INTRO_MS * LENTO : 0);
let marcado = inicioTransf === PRONTA;
const FIM_TRANSF = ONDA_MS + 700 + VOO_MS;

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const ceu = document.getElementById("ceu"); // camada das nuvens, por cima do relógio
const cctx = ceu.getContext("2d");
const params = new URLSearchParams(location.search);
const paletaDia = PALETAS[params.get("paleta")] ?? PALETAS.creme;
const comSombra = params.get("sombra") !== "0"; // ?sombra=0 desliga
const comSol = params.get("sol") !== "0"; // ?sol=0 volta ao bloco antigo (para comparar)
// Semente do ruído: muda a cada visita (palavras diferentes nas nuvens). ?seed=N repete um resultado.
const SEMENTE_RUIDO = params.has("seed") ? Number(params.get("seed")) | 0 : (Math.random() * 2 ** 31) | 0;
const filaRuido = ordem(RUIDO.length, SEMENTE_RUIDO + 1).map((i) => RUIDO[i]); // palavras que as nuvens recebem ao reaparecer
let ptrFila = 0;
const novaPalavra = (emUso) => { const [p, q] = proximaPalavra(filaRuido, ptrFila, emUso); ptrFila = q; return p; };
const css = getComputedStyle(document.documentElement);
const cor = (n) => css.getPropertyValue(n).trim();

let W = 0, H = 0, RODAPE = 120, fonteForma = 12, fonteRuido = 9; // RODAPE: altura medida do relógio (px)
let palavras = [];    // palavras pessoais (vazio se não carregarem: nada de forma)
let final = "";       // palavra final; vem de palavra-final.txt
let ruido = [];       // { texto, base, fase, periodo }
let forma = [];       // { texto, slot, base, fase, periodo, rank, p }
let rank = [];
let bloco = [];       // [{ x, y }]: posição de cada palavra no bloco, antes da transformação
let geoSol = null;    // geometria do sol (sol.js); nSol palavras nele, as outras são estrelas
let nSol = 0;
let nuvens = [];      // layout das nuvens (nuvens.js), com a palavra do centro em .palavra
let t0 = null;        // instante do primeiro quadro (para o intro das nuvens)

// ---------- tempo no Rio (tempo.js): cobertura → quantas nuvens, vento → velocidade, dia/noite → cor ----------
let tempo = lerSimulado(location.search) ?? neutro(agora());
let tempoAplicado = false;
let fatorAtual = 1, fatorAlvo = 1, derivaT = 0, noite = 0; // suavizados nos quadros
function aplicarTempo(d) {
  if (!d) return;
  tempo = d;
  fatorAlvo = fatorVento(d.vento);
  if (!tempoAplicado) { fatorAtual = fatorAlvo; noite = d.dia ? 0 : 1; tempoAplicado = true; }
  const n = nuvensParaCobertura(d.cobertura, nuvens.length);
  nuvens.forEach((nv, i) => (nv.alvoV = i < n ? 1 : 0)); // as n primeiras ficam; as outras murcham
  // chuva: entre as nuvens ativas, chovem as k de menor `rank` (sorteado por visita)
  const k = nuvensComChuva(d.chuva ?? 0, n);
  const ativas = nuvens.filter((nv) => nv.alvoV === 1).sort((a, b) => a.rank - b.rank);
  nuvens.forEach((nv) => (nv.alvoCh = 0));
  ativas.slice(0, k).forEach((nv) => (nv.alvoCh = d.chuva ?? 0));
}
aplicarTempo(tempo);
if (params.has("depurar")) window.__tempo = (d) => aplicarTempo({ ...tempo, ...d });

// Log da Open-Meteo sob demanda: no console do navegador, digite __tempoLog(). Consulta a API na hora (sem cache),
// mostra a resposta crua, o que o site entende dela e o que está usando agora. Não altera o site.
window.__tempoLog = async () => {
  const r = await lerBruto();
  console.group(`%cOpen-Meteo • ${new Date().toLocaleTimeString("pt-BR")} • HTTP ${r.status} • ${r.ms} ms`, "font-weight:bold");
  console.log("URL:", URL_TEMPO);
  if (r.erro) console.warn("Falhou:", r.erro);
  console.log("Resposta crua:", r.json);
  if (r.json?.current) console.table(r.json.current);
  const n = normalizarTempo(r.json);
  console.log("O site entende (cobertura 0..1, vento km/h, dia, chuva 0..1):", n ?? "resposta inválida: o site usa cache ou o tempo neutro");
  console.log("Em uso agora no site:", { ...tempo });
  console.log("Nuvens:", { naTela: nuvens.length, ativas: nuvens.filter((nv) => nv.alvoV === 1).length, chovendo: nuvens.filter((nv) => nv.alvoCh > 0).length, fatorVento: Number(fatorAtual.toFixed(2)) });
  console.groupEnd();
  return r.json;
};
if (params.has("depurar")) console.info("Digite __tempoLog() para ver a resposta da Open-Meteo.");

// ---------- conteúdo pessoal (texto simples em site/assets/*.txt) ----------
// Se os arquivos faltarem ou falharem, não há forma: só ruído e relógio.
const linhas = (txt) => txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

async function carregarPessoais() {
  try {
    const [rp, rf] = await Promise.all([fetch("assets/pessoais.txt", { cache: "no-cache" }), fetch("assets/palavra-final.txt", { cache: "no-cache" })]);
    if (!rp.ok || !rf.ok) return;
    const lista = linhas(await rp.text());
    const palavra = linhas(await rf.text())[0];
    if (palavra && lista.length) {
      final = palavra.toLocaleUpperCase("pt-BR"); // a palavra final é sempre maiúscula
      palavras = ordem(lista.length, SEED_PALAVRAS).map((i) => lista[i]);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", final);
    }
  } catch {
    /* sem rede ou arquivo ausente: só ruído */
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

// Trechos contíguos da máscara na linha y (a palavra ocupa y - h/2 .. y + h/2): [{ x0, x1 }].
function trechos(m, y, h) {
  const linhas = [y - h / 2, y, y + h / 2].map((yy) => Math.floor(yy) * W);
  const trs = [];
  let ini = -1;
  for (let x = 0; x <= W; x++) {
    const ok = x < W && linhas.every((r) => m[r + x]);
    if (ok && ini < 0) ini = x;
    else if (!ok && ini >= 0) { trs.push({ x0: ini, x1: x }); ini = -1; }
  }
  return trs;
}

// Preenche toda a forma, repetindo as palavras em ciclo. Cada trecho de cada linha é justificado
// (palavras curtas fecham as bordas). Devolve [{ i, x, y }].
function preencher(m, f) {
  ctx.font = `${f}px ${cor("--font-body")}`;
  const larguras = palavras.map((p) => ctx.measureText(p).width);
  const folga = f * 0.4;
  const minimo = Math.min(...larguras);
  const slots = [];
  const passo = f * 1.15;
  const pend = [];
  let k = 0;
  const gerar = () => k++ % palavras.length;
  for (let y = passo; y < H - RODAPE; y += passo) {
    for (const { x0, x1 } of trechos(m, y, f * 0.6)) {
      const ini = x0 + folga / 2, L = x1 - x0 - folga; // margem para trechos vizinhos não encostarem
      if (L < minimo) continue;
      for (const it of empacotar(larguras, pend, gerar, L, folga, 12, f * 1.2)) slots.push({ i: it.i, x: ini + it.x, y });
    }
  }
  return slots;
}

// Bloco: as mesmas palavras, na mesma ordem das linhas da forma, em um retângulo quase quadrado.
// Antes de ALVO elas ficam aqui; em ALVO cada uma segue para o seu slot.
function montarBloco(slots) {
  if (!slots.length) return [];
  ctx.font = `${fonteForma}px ${cor("--font-body")}`;
  const larguras = slots.map((s) => ctx.measureText(palavras[s.i]).width);
  const folga = fonteForma * 0.4, passo = fonteForma * 1.15;
  const util = H - RODAPE;
  const area = larguras.reduce((a, w) => a + w + folga, 0) * passo;
  const L = Math.min(W - 24, Math.max(Math.max(...larguras), Math.sqrt(area * 1.1)));
  const pos = linhasBloco(larguras, L, folga);
  const linhas = pos[pos.length - 1].linha + 1;
  const x0 = (W - L) / 2, y0 = (util - (linhas - 1) * passo) / 2;
  return pos.map((p) => ({ x: x0 + p.x, y: y0 + p.linha * passo }));
}

// Maior fonte que ainda usa todas as palavras ao menos uma vez.
function montar() {
  const dpr = devicePixelRatio || 1;
  W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
  RODAPE = (document.getElementById("relogio").offsetHeight || 100) + 16;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ceu.width = canvas.width; ceu.height = canvas.height;
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
    // fonte menor que a máxima: cabem mais slots e as palavras se repetem mais
    fonteForma = Math.max(Math.min(lo, FONTE_MIN), lo * FATOR_FONTE);
    slots = preencher(m, fonteForma);
    bloco = montarBloco(slots);
  }
  fonteRuido = Math.max(8, Math.min(11, W / 90 + 4));

  const rnd = (a) => Math.abs((Math.sin(a * 127.1) * 43758.5453) % 1);
  const antigos = forma;
  rank = new Array(slots.length);
  ordem(slots.length, SEED_ENCAIXE).forEach((idx, r) => (rank[idx] = r));
  forma = slots.map((s, i) => ({
    texto: palavras[s.i],
    slot: { x: s.x, y: s.y },
    bloco: bloco[i] ?? { x: s.x, y: s.y },
    atraso: (s.x / W) * ONDA_MS + rnd(i + 33) * 700,
    base: { x: rnd(i + 1) * W, y: rnd(i + 77) * (H - RODAPE) },
    fase: rnd(i + 5) * 6.28,
    periodo: 1800 + rnd(i + 9) * 2200,
    p: antigos[i]?.p ?? null,
  }));
  // Sol: as palavras (em ordem sorteada) preenchem o disco e os raios; as que sobram viram estrelas.
  ctx.font = `${fonteForma}px ${cor("--font-body")}`;
  forma.forEach((it) => { it.w = ctx.measureText(it.texto).width; it.sol = null; it.rankSol = -1; });
  geoSol = null; nSol = 0;
  if (comSol && forma.length) {
    geoSol = geometriaSol(W, H - RODAPE, fonteForma);
    const sol = preencherSol(geoSol, forma.map((it) => it.w), ordem(forma.length, SEED_SOL), fonteForma);
    const rk = ordemEntrada(sol, geoSol, SEED_SOL);
    sol.forEach((s, j) => { forma[s.i].sol = s; forma[s.i].rankSol = rk[j]; });
    nSol = sol.length;
  }
  // Ruído em grade com jitter: cobre a tela toda sem empilhar palavras.
  let cw = fonteRuido * 3, ch = fonteRuido * 2;
  const f = Math.max(1, Math.sqrt((W * H) / (cw * ch * RUIDO.length)));
  cw *= f; ch *= f;
  const cols = Math.max(1, Math.floor(W / cw)), rows = Math.max(1, Math.floor(H / ch));
  const celulas = Math.min(RUIDO.length, cols * rows);
  cw = W / cols; ch = H / rows;
  const palavrasRuido = ordem(RUIDO.length, SEMENTE_RUIDO);
  ruido = ordem(cols * rows, SEMENTE_RUIDO + 2).slice(0, celulas).map((c, i) => ({
    texto: RUIDO[palavrasRuido[i]],
    base: { x: (c % cols + 0.5 + (rnd(i + 301) - 0.5) * 0.5) * cw, y: (Math.floor(c / cols) + 0.5 + (rnd(i + 677) - 0.5) * 0.5) * ch },
    ax: cw * 0.3, ay: ch * 0.3,
    fase: rnd(i + 15) * 6.28,
    periodo: 3000 + rnd(i + 19) * 4000,
  }));
  // Cada palavra de ruído vai para uma nuvem; a mais próxima do centro vira a palavra dela.
  const antes = nuvens;
  nuvens = planejarNuvens(W, H);
  const rk = ordem(nuvens.length, SEMENTE_RUIDO + 3);
  nuvens.forEach((nv, i) => { nv.v = antes[i]?.v ?? null; nv.ch = antes[i]?.ch ?? 0; nv.rank = rk[i]; });
  aplicarTempo(tempo);
  nuvens.forEach((nv) => { nv.v ??= nv.alvoV; }); // primeira vez: já nasce no estado certo
  const ativas = nuvens.filter((nv) => nv.alvoV === 1);
  const destino = atribuir(ruido.map((r) => r.base), ativas);
  ruido.forEach((r, i) => {
    const nv = ativas[destino[i]];
    r.nuvem = nuvens.indexOf(nv);
    r.alvo = { x: nv.cx0 + (rnd(i + 901) - 0.5) * nv.w * 0.6, y: nv.cy + (rnd(i + 433) - 0.5) * nv.h * 0.4 };
    r.atraso = 800 + rnd(i + 57) * 1000 + (Math.hypot(r.base.x - nv.cx0, r.base.y - nv.cy) / Math.max(W, H)) * 500;
  });
  nuvens.forEach((nv, c) => {
    let melhor = null, dm = Infinity;
    for (const r of ruido) {
      if (r.nuvem !== c) continue;
      const d = Math.hypot(r.base.x - nv.cx0, r.base.y - nv.cy);
      if (d < dm) { dm = d; melhor = r; }
    }
    nv.palavra = antes[c]?.palavra ?? melhor?.texto ?? null; // ao redimensionar, a nuvem mantém a palavra
  });
  const emUso = new Set(nuvens.map((nv) => nv.palavra).filter(Boolean));
  nuvens.forEach((nv) => { if (!nv.palavra) { nv.palavra = novaPalavra(emUso); emUso.add(nv.palavra); } });
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

  // Ruído: só existe no intro da primeira visita; voa até a sua nuvem e some ao chegar.
  if (t0 === null) t0 = t;
  const ti = introNuvens ? (t - t0) / LENTO : Infinity; // ms (em tempo normal) desde o início do intro
  if (ti < INTRO_PUFF_MS + INTRO_PUFF_DUR + 1500) {
    ctx.textAlign = "center";
    ctx.fillStyle = cor("--color-ruido");
    for (const r of ruido) {
      const x = r.base.x + Math.sin(k * 0.45 + r.fase) * r.ax;
      const y = r.base.y + Math.cos(k * 0.37 + r.fase * 1.3) * r.ay;
      const p = Math.min(1, Math.max(0, (ti - r.atraso) / VOO_RUIDO_MS));
      if (p >= 1) continue;
      const e = p * p * (3 - 2 * p);
      const fade = 1 - Math.min(1, Math.max(0, (p - 0.75) / 0.25));
      ctx.font = `${fonteRuido * (1 - 0.35 * e)}px ${cor("--font-display")}`;
      ctx.globalAlpha = (y > H - RODAPE ? 0.3 : 0.55) * fade;
      const texto = p > 0 ? embaralhar(r.texto, Math.floor(t / 90) * 977 + ((r.fase * 1000) | 0)) : r.texto;
      ctx.fillText(texto, x * (1 - e) + r.alvo.x * e, y * (1 - e) + r.alvo.y * e);
    }
    ctx.textAlign = "left";
  }

  // Palavras da forma.
  ctx.font = `${fonteForma}px ${cor("--font-body")}`;
  const feitasSol = encaixadas(nSol, fracaoSol(n));
  const rot = reduzido ? 0 : giro(t);
  const fimOnda = FIM_TRANSF;
  const saiDoSol = inicioTransf === PRONTA ? 1 : Math.min(1, Math.max(0, (n - inicioTransf) / fimOnda));
  if (geoSol) desenharBrilho(geoSol, rot, suave(fracaoSol(n)) * (1 - saiDoSol));
  ctx.textAlign = "center";
  forma.forEach((it, i) => {
    const alvo = (it.sol ? it.rankSol < feitasSol : rank[i] < feitas) ? 1 : 0;
    if (it.p === null) it.p = alvo; // primeira vez: não anima o que já estava encaixado
    else it.p += Math.sign(alvo - it.p) * Math.min(Math.abs(alvo - it.p), dt / 1.8);

    if (it.p <= 0 && alvo === 0) return; // ainda não é a vez dela: só surge ao encaixar
    const e = it.p * it.p * (3 - 2 * it.p);
    // transformação em VOCE: cada palavra sai do bloco para o slot, em onda, a partir de ALVO
    const mm = reduzido ? (n >= inicioTransf ? 1 : 0) : Math.min(1, Math.max(0, (n - inicioTransf - it.atraso) / VOO_MS));
    const ms = mm * mm * (3 - 2 * mm);
    // soltas: vagam pela tela toda; ao entrar, vão para o lugar no sol (ou no bloco, com ?sol=0)
    const fx = it.base.x + Math.sin(k * 0.22 + it.fase) * W * 0.28 + Math.sin(k * 0.61 + it.fase * 2) * 30;
    const fy = it.base.y + Math.cos(k * 0.19 + it.fase * 1.3) * (H - RODAPE) * 0.28 + Math.cos(k * 0.53 + it.fase) * 24;
    const vx = Math.min(W - 10, Math.max(10, fx)), vy = Math.min(H - RODAPE, Math.max(10, fy));
    // origem da transformação: a posição atual no sol; estrelas e ?sol=0 partem de onde vagam / do bloco
    let ox = it.bloco.x, oy = it.bloco.y, ang = 0, a = e, cheio = 1;
    if (geoSol) {
      if (it.sol) {
        const ps = posicaoSol(it.sol, geoSol, rot);
        ox = ps.x - it.w / 2; oy = ps.y; ang = ps.ang * (1 - ms);
        if (it.sol.tipo === "raio") cheio = 1 - 0.4 * Math.min(1, (it.sol.r - geoSol.r0) / (geoSol.Rd * 2.4)); // esmaece nas pontas
      } else { ox = vx; oy = vy; a = e * (ALFA_ESTRELA + (1 - ALFA_ESTRELA) * ms); } // estrela: fraca até a onda de 21/11
    }
    const dx = ox * (1 - ms) + it.slot.x * ms, dy = oy * (1 - ms) + it.slot.y * ms;
    const x = vx * (1 - e) + dx * e;
    const y = vy * (1 - e) + dy * e;

    let texto = it.texto;
    if (!reduzido && it.p < 1) {
      const emTransito = it.p > 0.02;
      const ciclo = ((t + it.fase * 900) % it.periodo) / it.periodo;
      if (emTransito || ciclo < 0.7) texto = embaralhar(it.texto, Math.floor(t / (emTransito ? 90 : 160)) * 977 + ((it.fase * 1000) | 0));
    }
    // disco em creme, raios e estrelas em dourado; tudo vira dourado na transformação
    ctx.fillStyle = it.sol?.tipo === "disco" ? misturarHex(cor("--color-text"), cor("--color-accent"), ms) : cor("--color-accent");
    ctx.globalAlpha = a * (cheio * (1 - ms) + ms); // surge em fade enquanto vai para o lugar
    if (ang) { ctx.save(); ctx.translate(x + it.w / 2, y); ctx.rotate(ang); ctx.fillText(texto, 0, 0); ctx.restore(); }
    else ctx.fillText(texto, x + it.w / 2, y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  desenharCeu(t, ti, dt);
  if (!marcadoNuvens && ti > INTRO_MS) { gravarMarcaNuvens(); marcadoNuvens = true; }
  if (!marcado && temForma() && n > inicioTransf + FIM_TRANSF) { gravarMarca(); marcado = true; }
  relogio(n);
  requestAnimationFrame(quadro);
}

const suave = (v) => { const p = Math.min(1, Math.max(0, v)); return p * p * (3 - 2 * p); };

// Mistura duas cores "#rrggbb" (t = 0 dá `a`, t = 1 dá `b`).
function misturarHex(a, b, t) {
  const c = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [p, q] = [c(a), c(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`;
}

// Brilho do sol, por baixo das palavras: o halo do disco (o box-shadow do pen) e uma faixa de luz em cada raio
// (gradiente transparente → dourado → transparente, como no pen). `a` = 0..1.
function desenharBrilho(g, rot, a) {
  if (a <= 0.004) return;
  const ouro = [232, 184, 63];
  const rgba = (al) => `rgba(${ouro.join(",")},${al})`;
  const halo = ctx.createRadialGradient(g.cx, g.cy, g.Rd * 0.2, g.cx, g.cy, g.Rd * 1.9);
  halo.addColorStop(0, rgba(0.3 * a)); halo.addColorStop(0.55, rgba(0.14 * a)); halo.addColorStop(1, rgba(0));
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.Rd * 1.9, 0, Math.PI * 2); ctx.fill();
  for (const rg of g.raios) {
    const larg = rg.faixas * g.passo + g.passo * 0.4;
    ctx.save();
    ctx.translate(g.cx, g.cy);
    ctx.rotate(rg.ang + rot);
    const gr = ctx.createLinearGradient(rg.r0, 0, rg.rFim, 0);
    gr.addColorStop(0, rgba(0)); gr.addColorStop(0.5, rgba(0.16 * a)); gr.addColorStop(1, rgba(0));
    ctx.fillStyle = gr;
    ctx.fillRect(rg.r0, -larg / 2, rg.rFim - rg.r0, larg);
    ctx.restore();
  }
}

// ---------- nuvens (camada #ceu, por cima de tudo, inclusive do relógio) ----------
function desenharCeu(t, ti, dt) {
  cctx.clearRect(0, 0, W, H);
  const intro = ti !== Infinity;
  // vento: a velocidade segue o fator suavemente; a deriva é acumulada (nada pula quando o vento muda)
  fatorAtual += (fatorAlvo - fatorAtual) * Math.min(1, dt / 2);
  derivaT += reduzido ? 0 : dt * fatorAtual * (intro ? suave((ti - INTRO_DERIVA_MS) / 1000) : 1);
  // dia/noite: a cor muda aos poucos
  noite += ((tempo.dia ? 0 : 1) - noite) * Math.min(1, dt / 3);
  const paleta = noite < 0.002 ? paletaDia : misturar(paletaDia, PALETAS.noite, noite);
  const bob = reduzido ? 0 : intro ? suave((ti - 4500) / 1500) : 1;
  cctx.textAlign = "center";
  cctx.textBaseline = "middle";
  // Calcula estado e posição de todas as nuvens; as sombras são desenhadas primeiro, para ficarem por baixo
  // de qualquer nuvem (a sombra de uma nuvem nunca cai por cima de outra).
  const vivas = [];
  nuvens.forEach((nv, c) => {
    // nuvens entram estufando e saem murchando quando a cobertura muda (direto, com movimento reduzido)
    nv.v = reduzido ? nv.alvoV : nv.v + Math.sign(nv.alvoV - nv.v) * Math.min(Math.abs(nv.alvoV - nv.v), dt / 1.5);
    const uIntro = intro ? Math.min(1, Math.max(0, (ti - INTRO_PUFF_MS - c * 120) / INTRO_PUFF_DUR)) : 1;
    const u = uIntro * nv.v;
    const pos = posicao(nv, derivaT, reduzido ? 0 : t / 1000, bob);
    // deu a volta (saiu pela direita, voltou pela esquerda, fora da tela): ganha uma palavra nova
    if (nv.cxAnt !== undefined && pos.cx < nv.cxAnt - nv.span / 2) {
      nv.palavra = novaPalavra(new Set(nuvens.map((o) => o.palavra)));
    }
    nv.cxAnt = pos.cx;
    if (u <= 0) return;
    vivas.push({ nv, c, u, ...pos });
  });
  if (comSombra) for (const { nv, cx, cy, u } of vivas) desenharSombra(cctx, nv, cx, cy, paleta, 0.9 * Math.min(1, u * 2));
  // chuva: depois do intro, com rampa; atrás do corpo das nuvens (que são desenhadas em seguida)
  const rampaChuva = reduzido ? 0 : suave((ti - INTRO_MS) / 2000);
  const incl = Math.min(0.25, Math.max(0.02, ((fatorAtual - 0.5) / 2) * 0.25));
  for (const { nv, u, cx, cy } of vivas) {
    const alvo = nv.alvoCh * rampaChuva;
    nv.ch += (alvo - nv.ch) * Math.min(1, dt / 2);
    if (nv.ch < 0.005) { nv.ch = alvo === 0 ? 0 : nv.ch; continue; }
    desenharChuva(cctx, nv, cx, cy, t / 1000, nv.ch, paleta, incl, Math.min(1, u * 1.5));
  }
  for (const { nv, c, u, cx, cy } of vivas) {
    desenharNuvem(cctx, nv, cx, cy, u, paleta, 0.95);
    const a = (intro ? suave((ti - INTRO_PALAVRA_MS - c * 60) / 900) : 1) * Math.min(1, nv.v * 2);
    if (a <= 0) continue;
    const tam = Math.min(19 * ESCALA_NUVEM, Math.max(8, 11 * ESCALA_NUVEM, nv.w * 0.13)); // acompanha o tamanho da nuvem (piso de 8 px)
    cctx.font = `${tam}px ${cor("--font-display")}`;
    cctx.fillStyle = paleta.texto;
    cctx.globalAlpha = 0.9 * a;
    const texto = intro && ti < INTRO_PALAVRA_MS + 1200 && a < 1 ? embaralhar(nv.palavra, Math.floor(t / 90) * 977 + c) : nv.palavra;
    cctx.fillText(texto, Math.round(cx), Math.round(cy));
  }
  cctx.globalAlpha = 1;
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
// O tempo atrasa no máximo 1,5 s o começo; se vier depois, as nuvens ajustam sozinhas.
const simulado = lerSimulado(location.search) !== null;
const pTempo = simulado ? Promise.resolve() : carregarTempo(Date.now()).then(aplicarTempo);
const atraso = (ms) => new Promise((ok) => setTimeout(ok, ms));
Promise.all([carregarPessoais(), document.fonts?.load(`1em ${cor("--font-display")}`).catch(() => {}), document.fonts?.ready, Promise.race([pTempo, atraso(1500)])]).then(() => { montar(); requestAnimationFrame(quadro); });
// Atualiza a cada 15 min e ao voltar para a aba.
if (!simulado) {
  let ultimaBusca = Date.now();
  const atualizar = () => { ultimaBusca = Date.now(); buscarTempo(ultimaBusca).then(aplicarTempo); };
  setInterval(atualizar, ATUALIZAR_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - ultimaBusca > ATUALIZAR_MS) atualizar(); });
}
