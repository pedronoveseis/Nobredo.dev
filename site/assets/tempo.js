// O tempo no Rio de Janeiro (Open-Meteo, sem chave) muda as nuvens: cobertura → quantas, vento → velocidade,
// dia/noite → cor. Funções puras testadas em tools/tempo.test.mjs; o site nunca depende da API.
// Dados: Open-Meteo.com (CC BY 4.0), https://open-meteo.com/. Só vão as coordenadas fixas do Rio.

export const RIO = { lat: -22.9068, lon: -43.1729 };
export const URL_TEMPO = `https://api.open-meteo.com/v1/forecast?latitude=${RIO.lat}&longitude=${RIO.lon}&current=cloud_cover,wind_speed_10m,is_day,precipitation&timezone=America%2FSao_Paulo`;
export const TTL_MS = 30 * 60 * 1000;
export const ATUALIZAR_MS = 15 * 60 * 1000;
export const MIN_NUVENS = 5;
const CHAVE = "nobredo-tempo";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// 6h–18h no fuso de São Paulo: plano B quando a API não responde.
export function ehDia(ms) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(ms));
  return h >= 6 && h < 18;
}

export const neutro = (ms) => ({ cobertura: 0.5, vento: 12, dia: ehDia(ms), chuva: 0 });

// Precipitação (mm) → intensidade da chuva 0..1: 0,1 mm ≈ 0,14; 1 mm ≈ 0,45; 5 mm ou mais = 1.
export function intensidadeChuva(mm) {
  return Number.isFinite(mm) && mm > 0 ? clamp(Math.sqrt(mm / 5), 0, 1) : 0;
}

// Quantas das n nuvens ativas chovem: nenhuma sem chuva; com qualquer chuva, pelo menos uma.
export function nuvensComChuva(intensidade, n) {
  if (!(intensidade > 0) || n <= 0) return 0;
  return Math.min(n, Math.max(1, Math.round(intensidade * n)));
}

// Resposta da API → { cobertura: 0..1, vento: km/h, dia, chuva: 0..1 }, ou null se estiver incompleta ou inválida.
export function normalizarTempo(json, ms = Date.now()) {
  const c = json?.current;
  if (!c || typeof c.cloud_cover !== "number" || typeof c.wind_speed_10m !== "number") return null;
  if (!Number.isFinite(c.cloud_cover) || !Number.isFinite(c.wind_speed_10m) || c.cloud_cover < 0 || c.cloud_cover > 100 || c.wind_speed_10m < 0) return null;
  return { cobertura: c.cloud_cover / 100, vento: Math.min(150, c.wind_speed_10m), dia: c.is_day === 1 ? true : c.is_day === 0 ? false : ehDia(ms), chuva: intensidadeChuva(c.precipitation) };
}

// Céu limpo = MIN_NUVENS; totalmente encoberto = o máximo da tela.
export function nuvensParaCobertura(cobertura, max) {
  return Math.round(MIN_NUVENS + clamp(cobertura, 0, 1) * (Math.max(MIN_NUVENS, max) - MIN_NUVENS));
}

// Vento (km/h) → fator da velocidade das nuvens: calmaria = metade, ventania = 2,5×.
export function fatorVento(kmh) {
  return clamp(0.5 + (Number.isFinite(kmh) ? kmh : 12) / 20, 0.5, 2.5);
}

export const cacheValido = (entrada, ms, ttl = TTL_MS) =>
  !!entrada && typeof entrada.t === "number" && !!entrada.dados && ms - entrada.t >= 0 && ms - entrada.t < ttl;

// ?cobertura=0..1&vento=km/h&noite=1&chuva=0..1 simula o tempo (como ?data= simula a data). null se nada foi pedido.
export function lerSimulado(search) {
  const q = new URLSearchParams(search);
  if (!["cobertura", "vento", "noite", "chuva"].some((k) => q.has(k))) return null;
  const n = (k, padrao) => (Number.isFinite(parseFloat(q.get(k))) ? parseFloat(q.get(k)) : padrao);
  return { cobertura: clamp(n("cobertura", 0.5), 0, 1), vento: clamp(n("vento", 12), 0, 150), dia: q.get("noite") !== "1", chuva: clamp(n("chuva", 0), 0, 1) };
}

const lerCache = () => { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch { return null; } };
const gravarCache = (dados, ms) => { try { localStorage.setItem(CHAVE, JSON.stringify({ t: ms, dados })); } catch { /* sem armazenamento: ok */ } };

export async function buscarTempo(ms = Date.now(), limiteMs = 4000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), limiteMs);
  try {
    const r = await fetch(URL_TEMPO, { signal: ac.signal, referrerPolicy: "no-referrer" });
    if (!r.ok) return null;
    const dados = normalizarTempo(await r.json(), ms);
    if (dados) gravarCache(dados, ms);
    return dados;
  } catch {
    return null; // sem rede, bloqueado ou lento: o site segue sem o tempo
  } finally {
    clearTimeout(timer);
  }
}

// Cache válido → usa na hora; senão API; se falhar, o cache velho; se não houver, neutro.
export async function carregarTempo(ms = Date.now()) {
  const cache = lerCache();
  if (cacheValido(cache, ms)) return cache.dados;
  return (await buscarTempo(ms)) ?? cache?.dados ?? neutro(ms);
}
