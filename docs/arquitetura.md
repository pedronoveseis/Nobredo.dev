# Arquitetura: contagem regressiva até o pedido de namoro

> Status: **pivô para site estático no Netlify + função de tempo** (rodada 6, ver seção 11). O backend Ktor (seções 2 a 10) fica **parqueado** para a fase do app KMP.
> Última atualização: 2026-10-03 (rodada 6).

## 1. Contexto

Site pessoal e privado, feito para uma única destinatária. Ele funciona como uma contagem regressiva até **22/11/2026**, por volta das **16h**, data e hora do pedido de namoro (três meses do primeiro beijo). Até lá, o autor posta pistas pelo admin e ela vai desvendando. Quando o relógio chega a zero, tudo se junta e forma o pedido. Depois disso começa uma **contagem progressiva**: o site é um meio, não o fim.

Restrições e intenções:

- A destinatária recebe **um link** por mensagem. Sem login, sem cadastro.
- Celular e notebook mostram a **mesma informação** para ela.
- O autor tem uma área **/admin** com login e senha, onde cria e publica conteúdo.
- Nenhuma foto do casal é exposta. Só ilustrações, GIFs, textos e coordenadas (locais visitados).
- Sem Flutter. Preferência por Kotlin. App mobile (KMP + Compose + SwiftUI) só **depois** do pedido.
- Há um brand book (tipografia e cores), mas é pessoal: só alguns detalhes serão compartilhados.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Escopo | Uso pessoal, uma destinatária, link enviado por mensagem |
| Data alvo | 22/11/2026, ~16h (fuso America/Sao_Paulo, guardado em UTC) |
| Backend | **Ktor (Kotlin)** |
| Banco | **SQLite** (Exposed) em volume persistente |
| Admin | Páginas servidas pelo Ktor (`kotlinx.html` + HTMX), login e senha com hash (Argon2/bcrypt) |
| Front da destinatária | Web leve (HTML/CSS/JS-TS), servido pelo Ktor, com **design tokens** mínimos |
| Liberação de conteúdo | **Sempre no servidor**, pelo horário do servidor |
| Publicação | **Manual, a critério do autor, pelo admin**. Agendamento é opcional. |
| Mecânica | **Jardim**: flores (girassóis, flores do campo, a definir) ligadas a coordenadas de locais visitados |
| Trajetória | O autor monta a trajetória aos poucos; ela decifra as coordenadas |
| Mapa | Não é necessário mapa real |
| Cena final | Tudo junto, formando o pedido quando a contagem regressiva zera. **O conteúdo dela e o motivo recorrente do site são definidos só pelo admin e ficam fora do repositório** (a surpresa não deve estar versionada) |
| Depois do "sim" | Contagem **progressiva** (tempo juntos), iniciada pelo autor (ver 3.2) |
| App KMP | Depois do 22/11/2026, como cliente da mesma API |

### 2.1 Por que backend e não JSON estático

Se o conteúdo futuro estiver num JSON público, ela vê o pedido pelo DevTools, ou adianta o relógio do aparelho. O servidor só entrega o que já foi publicado, e o conteúdo da cena final só sai do servidor quando a contagem zera. A contagem regressiva usa a hora do servidor.

### 2.2 Por que não precisa de login para a destinatária

O estado que ela vê deriva do que foi publicado e da data, então qualquer dispositivo mostra o mesmo. Para o que for estado dela (por exemplo, enigmas resolvidos), a chave é o **token do link** (`/p/{token}`), guardado no servidor. Cookie e `localStorage` ficam só como cache.

## 3. Modelo de conteúdo e fases do site

### 3.1 Drops

```
drop:   id, tipo, payload (JSON), dica, ordem, status, publicar_em (opcional)
        tipo   = texto | gif | imagem | flor | coordenada | enigma | audio | ...
        status = rascunho | publicado
config: alvo_em (UTC), token_do_link, tema
estado: token, drop_id, resolvido_em   (opcional, para enigmas)
```

- O autor publica quando quiser (**surpresa**: "mexi no site, descubra") ou deixa agendado em `publicar_em`.
- O front tem um renderizador por `tipo`. Um tipo novo é um componente novo, sem mudar API nem banco.
- Os drops publicados ficam todos visíveis ao mesmo tempo, formando o jardim aos poucos.

### 3.2 Fases do site (máquina de estados)

```
CONTAGEM_REGRESSIVA  --(agora >= alvo_em)-->  AGUARDANDO  --(autor aperta "ela aceitou")-->  NAMORO
```

1. **Contagem regressiva:** até `alvo_em` (22/11/2026, ~16h). O jardim cresce com os drops publicados. A cena final **não** é enviada ao cliente.
2. **Aguardando:** o relógio zerou, a cena final é liberada e o pedido aparece. O horário real do "sim" ainda não é conhecido.
3. **Namoro:** o autor registra no admin o instante exato em que ela aceitou (`namoro_inicio_em`). A partir dali o site mostra a **contagem progressiva** (tempo juntos). O ponto de partida da contagem vem do admin, não do relógio, para ser o instante real do "sim".

Ponto a confirmar: se o relógio zerar às 16h e ela só responder minutos depois, a fase "Aguardando" cobre isso. Se preferir que a contagem progressiva comece sozinha no horário-alvo, é só ligar `namoro_inicio_em = alvo_em` sem passar pelo botão.

## 4. Privacidade

- Link não adivinhável (`/p/{token}`), `noindex`, `robots.txt` bloqueando tudo, sem analytics ou trackers.
- Sem fotos de vocês. Remover EXIF de qualquer imagem enviada.
- Coordenadas dos locais visitados só vão ao cliente **depois de publicadas**. Avaliar reduzir a precisão (arredondar), já que o link pode ser repassado.
- Senha-enigma de entrada: opcional, para depois.
- `/admin` com login, rate-limit e hash de senha.
- Brand book: nada pessoal vai para o repositório. Só o necessário (cores e fontes) como tokens.
- Domínio: conferir o que o WHOIS expõe antes de registrar (ver seção 6).
- Depois do pedido: decidir entre manter ou arquivar o site.

## 5. Hospedagem

Requisitos mínimos: Docker/JVM, **pelo menos 1 GB de RAM**, disco persistente, HTTPS. Hospedagem compartilhada (PHP) **não** serve para Ktor.

| Opção | Esforço | Controle | Observação |
|---|---|---|---|
| **PaaS** (Fly.io região `gru`, ou Umbler) | Menor | Médio | Deploy de container sem manter servidor |
| **VPS Hostinger** (com template Docker) | Médio | Alto | Pagamento em reais; confirmar localização do datacenter e planos |
| VPS de outro provedor BR (Locaweb, Magalu Cloud, KingHost) | Médio | Alto | Mesmo desenho do Hostinger |

Inclinação atual: **VPS Hostinger**, com **Docker Compose** (Ktor), **Caddy** na frente (HTTPS automático), SQLite e mídias em volume e backup diário simples. Falta confirmar o plano. Valores e planos mudam: conferir no site antes de contratar.

## 6. Domínio

- Ainda a decidir pelo autor.
- Se `nobredo.dev` for do autor, usar um **subdomínio discreto** resolve sem custo.
- `.br` (Registro.br) exige CPF ou CNPJ; verificar o que o WHOIS expõe para pessoa física.
- Alternativa: `.com` ou `.dev` em registrador com proteção de WHOIS.

## 7. Bloqueios

| # | Item | Bloqueia | Pode andar sem ele |
|---|---|---|---|
| 1 | **Domínio** | Deploy final com HTTPS e o link definitivo | Todo o desenvolvimento local, Docker Compose, testes e o backend |
| 2 | **Brand book** (só alguns detalhes: cores, fontes). Bloqueio *posterior*: só pesa na troca do tema | O visual final do front | Backend, admin, API, máquina de estados e um tema neutro provisório, trocado depois por tokens |

Enquanto os dois não chegam, dá para construir o esqueleto, o modelo de dados, o admin e a máquina de estados com um tema provisório.

## 8. Cronograma proposto

| Quando | Entrega |
|---|---|
| Semana 1 | Esqueleto Ktor, SQLite, máquina de estados, tela com contagem regressiva, tema provisório |
| Semana 2 | Admin com login, CRUD de drops, publicar agora ou agendar, upload |
| Semana 3 | Jardim e coordenadas, tokens do brand book, deploy com domínio |
| Semanas 4 a 7 | Conteúdo, drops surpresa e ajustes |
| 22/11, ~16h | Contagem zera, cena final, "ela aceitou" e contagem progressiva |

## 9. Questões em aberto

1. **Domínio** (bloqueio): é possível usar `nobredo.dev`? Se não, qual registrador?
2. **Brand book** (bloqueio): cores em hex e fontes (Google Fonts ou arquivos próprios, por causa de licença). Logo é opcional.
3. **Servidor:** confirmar VPS Hostinger (plano, RAM, datacenter) ou PaaS.
4. **Cena final:** a composição visual da animação (como as peças do jardim se juntam até o final). O conteúdo está decidido, mas fora do repositório.
5. **Contagem progressiva:** começa pelo botão do admin ("ela aceitou") ou automaticamente em `alvo_em`? Em que unidade mostrar (dias, horas, minutos, segundos)?
6. **Senha-enigma de entrada:** vale usar? Qual resposta?
7. **Depois do pedido:** manter no ar, arquivar ou apagar?

## 10. Implementado (semana 1)

- Projeto Gradle (Kotlin 2.4, Ktor 3.6, Exposed 1.5, SQLite).
- Máquina de estados `COUNTDOWN → AWAITING → TOGETHER`, derivada só do relógio do servidor e do registro do "sim".
- Tela da destinatária em `/p/{token}`: contagem regressiva, drops e cena final por tipo, contagem progressiva, tema provisório.
- API pública com filtragem no servidor (rascunho, agendado e cena final nunca saem antes da hora).
- API de admin protegida por HTTP Basic com senha em PBKDF2.
- `noindex` em todas as respostas, `robots.txt`, logs sem SQL.
- 12 testes (máquina de estados, vazamento de conteúdo, autenticação, hash).

Ainda não: UI do admin, upload de mídia, rate-limit no login, Dockerfile e Compose (dependem do servidor e do domínio).

## 11. Pivô: Netlify (rodada 6)

Decisão do autor: publicar por **commit e push** e priorizar simplicidade e personalização. Resolve hospedagem e domínio (endereço `*.netlify.app`, domínio fica opcional).

| Tema | Decisão |
|---|---|
| Hospedagem | Netlify, deploy pelo GitHub (repositório privado) |
| Front | HTML + CSS + JS puro em `site/`. Personalização por variáveis CSS em `site/assets/theme.css`; sem framework |
| Link dela | `/p/<token>`; o HTML é só a casca, quem valida o token é a função |
| Tempo e segredo | Função `netlify/functions/state.mjs` devolve só o que já pode ser visto; cena final só depois de `TARGET_AT` |
| Conteúdo | `content/drops.json` (só o que já é para ser visto); rascunhos ficam em outro branch. `publishAt` opcional por drop |
| Segredos (variáveis de ambiente no Netlify, **fora do repo**) | `LINK_TOKEN` (>=16 caracteres), `FINAL_WORD`, opcionais `TARGET_AT`, `TOGETHER_SINCE` |
| Contagem progressiva | Começa em `TARGET_AT` ou em `TOGETHER_SINCE` (muda a variável e faz redeploy) |
| Admin com login | Não existe nesta fase. O "admin" é o Git |
| Ktor | Parqueado em `src/`. Retomar com o app KMP, com a mesma forma de API (`/api/p/{token}/state`) |

Fica em aberto: ver se o plano gratuito do Netlify basta (funções, banda) e se o repositório privado é aceito no plano atual. Conferir no site.
