// Cifra das palavras pessoais (AES-GCM, WebCrypto). Roda no navegador e no Node.
const subtle = globalThis.crypto.subtle;

const paraB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const paraB64Url = (bytes) => paraB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64Url = (s) => deB64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

export function novaChave() {
  return paraB64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

const importar = (chave) => subtle.importKey("raw", deB64Url(chave), "AES-GCM", false, ["encrypt", "decrypt"]);

export async function cifrar(palavras, chave) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const dados = await subtle.encrypt({ name: "AES-GCM", iv }, await importar(chave), new TextEncoder().encode(JSON.stringify(palavras)));
  return { v: 1, iv: paraB64(iv), dados: paraB64(dados) };
}

// Devolve a lista de palavras, ou null se a chave não serve.
export async function decifrar(pacote, chave) {
  try {
    const claro = await subtle.decrypt({ name: "AES-GCM", iv: deB64(pacote.iv) }, await importar(chave), deB64(pacote.dados));
    const lista = JSON.parse(new TextDecoder().decode(claro));
    return Array.isArray(lista) && lista.every((p) => typeof p === "string") ? lista : null;
  } catch {
    return null;
  }
}
