# Arquitetura: contagem regressiva até o pedido de namoro

> Status: **fase de arquitetura / brainstorm**. Nada implementado ainda.
> Última atualização: 2026-10-01.

## 1. Contexto

Site pessoal e privado, feito para uma única destinatária. Ele funciona como uma contagem regressiva até **22/11/2026**, data em que o pedido de namoro acontece (três meses do primeiro beijo). Até lá, o autor libera pistas ("drops") que a destinatária vai desvendando. No dia 22/11 as peças se juntam e formam o pedido.

Restrições e intenções:

- A destinatária recebe **um link** por mensagem. Sem login, sem cadastro.
- Celular e notebook mostram a **mesma informação** para ela.
- O autor tem uma área **/admin** com login e senha, onde cria e agenda conteúdo.
- Nenhuma foto do casal é exposta. Só ilustrações, GIFs, textos e coordenadas.
- Sem Flutter. Preferência por Kotlin. App mobile (KMP + Compose + SwiftUI) só **depois** do pedido.
- Há uma identidade visual própria (brand book com tipografia e cores).

## 2. Decisões

| Tema | Decisão |
|---|---|
| Escopo | Uso pessoal, um destinatário, link enviado por mensagem |
| Data alvo | 22/11/2026 |
| Backend | **Ktor (Kotlin)** |
| Banco | **SQLite** (Exposed) em volume persistente |
| Admin | Páginas servidas pelo Ktor (`kotlinx.html` + HTMX), login e senha com hash (Argon2/bcrypt) |
| Front da destinatária | Web leve (HTML/CSS/JS-TS), servido pelo Ktor, com **design tokens** do brand book |
| Liberação de conteúdo | **Sempre no servidor**, pelo horário do servidor |
| Mecânica | **Jardim**: cada drop planta uma flor ligada a uma coordenada (locais visitados) |
| Mapa | Não é necessário mapa real; a trajetória é decifrada pelas pistas |
| Cadência de conteúdo | Em aberto, mas com ritmo mensal de flores (girassóis, flores do campo, a definir) |
| App KMP | Depois de 22/11/2026, como cliente da mesma API |

### 2.1 Por que backend e não JSON estático

Se o conteúdo futuro estiver num JSON público, ela vê o pedido pelo DevTools, ou adianta o relógio do aparelho. O servidor só entrega drops cujo `unlock_at` já passou, e o conteúdo da cena final só sai do servidor no dia 22/11. A contagem regressiva usa a hora do servidor.

### 2.2 Por que não precisa de login para a destinatária

O estado que ela vê deriva da data, então qualquer dispositivo mostra o mesmo. Para o que for estado dela (por exemplo, enigmas resolvidos), a chave é o **token do link** (`/p/{token}`), guardado no servidor. Cookie e `localStorage` ficam só como cache.

## 3. Modelo de conteúdo (rascunho)

```
drop:   id, unlock_at, tipo, payload (JSON), dica, peca, status
        tipo   = texto | gif | imagem | flor | coordenada | enigma | audio | ...
        status = rascunho | agendado | liberado
final:  cena_final (liberada só em 22/11/2026, no horário definido)
config: data_alvo, token_do_link, tema
estado: token, drop_id, resolvido_em   (opcional, para enigmas)
```

Formas de liberar:

1. **Agendado:** o servidor libera sozinho na data e hora marcadas.
2. **Surpresa:** liberar agora pelo admin. É o "mexi no site, descubra".

O front tem um renderizador por `tipo`. Um tipo novo é um componente novo, sem mudar API nem banco.

## 4. Privacidade

- Link não adivinhável (`/p/{token}`), `noindex`, `robots.txt` bloqueando tudo, sem analytics ou trackers.
- Sem fotos de vocês. Remover EXIF de qualquer imagem enviada.
- Coordenadas dos locais visitados só vão ao cliente **depois** do `unlock_at`. Avaliar reduzir a precisão (arredondar), já que o link pode ser repassado.
- Senha-enigma de entrada: opcional, para depois.
- `/admin` com login, rate-limit e hash de senha.
- Domínio: conferir o que o WHOIS expõe antes de registrar (ver seção 6).
- Depois do dia 22: decidir entre manter ou arquivar o site.

## 5. Hospedagem

Requisitos mínimos: Docker/JVM, **pelo menos 1 GB de RAM**, disco persistente, HTTPS. Hospedagem compartilhada (PHP) **não** serve para Ktor.

| Opção | Esforço | Controle | Observação |
|---|---|---|---|
| **PaaS** (Fly.io região `gru`, ou Umbler) | Menor | Médio | Deploy de container sem manter servidor |
| **VPS Hostinger** (com template Docker) | Médio | Alto | Pagamento em reais; confirmar localização do datacenter e planos |
| VPS de outro provedor BR (Locaweb, Magalu Cloud, KingHost) | Médio | Alto | Mesmo desenho do Hostinger |

Plano de VPS: **Docker Compose** com o Ktor, **Caddy** na frente (HTTPS automático), SQLite e mídias em volume, backup diário simples (cópia do arquivo `.db` e da pasta de mídia). Hostinger é uma opção válida, desde que o plano seja **VPS** e não hospedagem compartilhada.

Valores e planos mudam: conferir no site de cada provedor antes de contratar.

## 6. Domínio

- Ainda a decidir.
- Se `nobredo.dev` for do autor, usar um **subdomínio discreto** resolve sem custo.
- `.br` (Registro.br) exige CPF ou CNPJ; verificar o que o WHOIS expõe para pessoa física.
- Alternativa: `.com` ou `.dev` em registrador com proteção de WHOIS.

## 7. Cronograma proposto

| Quando | Entrega |
|---|---|
| Semana 1 | Esqueleto Ktor, SQLite, tela com contagem regressiva, 1 drop de teste |
| Semana 2 | Admin com login, CRUD de drops, upload e agendamento |
| Semana 3 | Mecânica do jardim e coordenadas, visual com os tokens do brand book |
| Semanas 4 a 7 | Conteúdo, drops surpresa e ajustes |
| 22/11 | Cena final liberada |

## 8. Questões em aberto

1. **Domínio:** é possível usar `nobredo.dev`? Se não, qual registrador?
2. **Servidor:** VPS Hostinger (mais controle e aprendizado) ou PaaS (menos esforço)? Confirmar plano e datacenter.
3. **Cadência dos drops:** quantos e com que ritmo até 22/11? Alinhar com o envio mensal de flores.
4. **Brand book:** fontes (Google Fonts ou arquivos próprios, por causa de licença), paleta em hex, logo.
5. **Cena final:** como o jardim "floresce" e mostra o pedido? Definir a composição.
6. **Senha-enigma de entrada:** vale usar? Qual resposta?
7. **Depois do 22/11:** manter no ar, arquivar ou apagar?
