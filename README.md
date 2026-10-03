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
