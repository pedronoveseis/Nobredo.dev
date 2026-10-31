# Nobredo.dev

Site estático (HTML + CSS + JS puro, sem build) publicado no GitHub Pages.

Centenas de palavras flutuam e se embaralham; entre **01/11/2026 00h** e **22/11/2026 16h** (Brasília) elas vão se encaixando até formar uma palavra. Depois do alvo, o relógio vira contagem progressiva.

## Rodar local

```sh
cd site && python3 -m http.server 8080
```

Para simular uma data: `http://localhost:8080/?data=2026-11-10T12:00:00-03:00` (o tempo segue correndo a partir dela).

## Testes

```sh
node --test tools/core.test.mjs
```

## Arquivos

| Arquivo | Função |
|---|---|
| `site/assets/core.js` | Lógica pura: janela de datas, fração, ordem determinística, embaralhar |
| `site/assets/app.js` | Canvas, forma, animação, relógio |
| `site/assets/words.js` | Palavras (as atuais são de teste e genéricas) |
| `site/assets/theme.css` | Tokens de cor e fonte (provisórios) |
| `.github/workflows/pages.yml` | Deploy no Pages a cada push no `main` |

## Publicar

Settings → Pages → Source: **GitHub Actions**. O workflow publica a pasta `site/` quando há push no `main`.

## Atenção: repositório público

Tudo aqui é legível por qualquer pessoa. Não colocar nada pessoal (nomes, locais, brand book). O código e o parâmetro `?data=` revelam o final para quem inspecionar a página.

`_arquivo/` guarda a abordagem anterior (Ktor, SQLite, admin, Netlify), parqueada.
