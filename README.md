# Nobredo.dev

> **Atual:** site estático em `site/` + função em `netlify/functions/`, publicado no Netlify. O backend Ktor (`src/`, abaixo) está parqueado até a fase do app.

## Netlify

1. Conectar o repositório no Netlify (publish `site`, sem build command; o `netlify.toml` já cobre).
2. Variáveis de ambiente (nunca no repositório): `LINK_TOKEN` (>=16 caracteres, `A-Za-z0-9_-`), `FINAL_WORD`; opcionais `TARGET_AT` (padrão `2026-11-22T16:00:00-03:00`) e `TOGETHER_SINCE`.
3. Link dela: `https://<site>.netlify.app/p/<LINK_TOKEN>`.
4. Novo drop: adicionar em `content/drops.json` (`{ "id", "kind", "payload", "hint"? , "publishAt"? }`) e dar push. Imagens em `site/media/`. Rascunhos em outro branch.
5. Testes da lógica: `node --test netlify/functions/lib.test.mjs`.

---

# nobredo

Site privado em contagem regressiva até 22/11/2026, às 16h. Ktor (Kotlin) + SQLite. Veja `docs/arquitetura.md`.

## Rodar localmente

Requisitos: JDK 21.

```bash
export LINK_TOKEN=$(openssl rand -hex 16)
./gradlew installDist
export ADMIN_PASSWORD_HASH=$(build/install/nobredo/bin/nobredo hash-password)   # pede a senha (mín. 12 chars)
build/install/nobredo/bin/nobredo
```

Abra `http://localhost:8080/p/$LINK_TOKEN`. Qualquer outro caminho dá 404.

Testes: `./gradlew test`.

## API

Pública (a chave é o token do link):

| Método | Rota | O que faz |
|---|---|---|
| GET | `/p/{token}` | A página |
| GET | `/api/p/{token}/state` | Fase, hora do servidor, drops visíveis e, só depois do alvo, a cena final |

Admin (HTTP Basic; a UI do admin vem na semana 2):

| Método | Rota | O que faz |
|---|---|---|
| GET | `/admin/api/drops` | Lista todos, inclusive rascunhos |
| POST | `/admin/api/drops` | Cria. `{"kind","payload","hint?","position?","publishAt?"}`. Sem `publishAt` = rascunho; futuro = agendado |
| POST | `/admin/api/drops/{id}/publish` | Publica agora |
| PUT | `/admin/api/final-scene` | Define o conteúdo da cena final (fica só no banco) |
| POST | `/admin/api/together` | Registra o "sim". Só depois do alvo, e uma vez |

Tipos de drop com renderizador: `texto`, `flor`, `coordenada`, `gif`, `imagem` (`src` deve começar com `/media/` ou `https://`). Um tipo novo é uma entrada nova em `renderers` no `static/app.js`.

## Conteúdo que não entra no repositório

O conteúdo da cena final e os drops moram **só no banco** (`DB_PATH`), definidos pelo admin. Nada disso é versionado, nem em exemplos ou testes (os testes usam texto genérico).

## Tema

`src/main/resources/static/theme.css` tem tokens provisórios. Troque só os valores quando o brand book chegar.
