// Lógica pura (sem DOM), testada em tools/core.test.mjs.

export const INICIO = Date.parse("2026-11-01T00:00:00-03:00"); // começa a animação
export const ALVO = Date.parse("2026-11-21T00:00:00-03:00"); // forma completa
export const JUNTOS_DESDE = Date.parse("2026-10-22T00:00:00-03:00"); // marca 30 dias em ALVO

// 0 antes de INICIO, 1 em ALVO, linear no meio.
export function fracao(agora, inicio = INICIO, alvo = ALVO) {
  return Math.min(1, Math.max(0, (agora - inicio) / (alvo - inicio)));
}

// Encaixe quase linear, um pouco mais calmo no começo: algo novo surge todo dia e a forma fecha no alvo.
// Com ~278 palavras são ~7 no primeiro dia e ~14 por dia na média.
const EXPOENTE = 1.2;
export function curva(f) {
  return f ** EXPOENTE;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Permutação 0..n-1, igual em qualquer aparelho para a mesma semente.
export function ordem(n, seed) {
  const rand = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Troca a ordem das letras; garante resultado diferente quando possível.
export function embaralhar(palavra, seed) {
  const letras = [...palavra];
  if (new Set(letras).size < 2) return palavra;
  const rand = mulberry32(seed);
  let tentativas = 0;
  let out;
  do {
    const a = letras.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    out = a.join("");
  } while (out === palavra && ++tentativas < 8);
  return out;
}

// Quantas palavras já devem estar encaixadas.
export function encaixadas(total, f) {
  return Math.floor(f * total + 1e-9);
}

// Dias, horas, minutos, segundos a partir de milissegundos.
export function partes(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(t / 86400), Math.floor(t / 3600) % 24, Math.floor(t / 60) % 60, t % 60];
}

// Preenche um trecho de largura L com palavras da fila `pend` (índices; `gerar()` repõe o ciclo).
// Segue a ordem da fila; perto da ponta, escolhe palavra mais curta para fechar a borda, e no fim
// justifica a sobra (até `extraMax` por intervalo; acima disso, centraliza). Devolve [{ i, x }] com x relativo ao trecho.
export function empacotar(larguras, pend, gerar, L, folga, janela, extraMax) {
  const itens = [];
  let restante = L;
  for (;;) {
    while (pend.length < janela) pend.push(gerar());
    const gap = itens.length ? folga : 0;
    const cabem = [];
    for (let k = 0; k < janela; k++) if (larguras[pend[k]] + gap <= restante) cabem.push(k);
    if (!cabem.length) break;
    let k = cabem[0] === 0 ? 0 : cabem.reduce((a, b) => (larguras[pend[b]] > larguras[pend[a]] ? b : a));
    // se a próxima da fila não deixaria espaço para outra palavra, fecha com a que melhor encaixa
    const menor = Math.min(...cabem.map((c) => larguras[pend[c]]));
    if (k === 0 && restante - gap - larguras[pend[0]] - folga < menor) {
      k = cabem.reduce((a, b) => (larguras[pend[b]] > larguras[pend[a]] ? b : a));
    }
    const i = pend.splice(k, 1)[0];
    itens.push({ i, x: 0 });
    restante -= larguras[i] + gap;
  }
  if (!itens.length) return itens;
  const n = itens.length;
  const sobra = restante;
  const extra = n > 1 && sobra / (n - 1) <= extraMax ? sobra / (n - 1) : 0;
  let x = n > 1 && extra > 0 ? 0 : sobra / 2;
  for (const it of itens) {
    it.x = x;
    x += larguras[it.i] + folga + extra;
  }
  return itens;
}
