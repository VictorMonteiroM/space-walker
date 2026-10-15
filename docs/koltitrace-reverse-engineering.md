# Koltitrace QR landing page — análise de engenharia reversa (QA)

**Alvo:** `https://qr.koltitrace.com/<id-base64>`
**Link de exemplo analisado:** `https://qr.koltitrace.com/YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U`
**Método:** análise estática e passiva do front-end público (HTML + bundles JS/CSS
servidos a qualquer visitante), com análise reforçada pela ferramenta REA
(`rea-agents`). Nenhuma chamada de API, autenticação, enumeração de outros lotes ou
teste de carga foi realizada.
**Autorização:** conduzida como parte de um QA/teste de segurança para a Koltiva,
conforme informado pelo solicitante.
**Entregável irmão:** reconstrução funcional em `../koltitrace-clone/`.

---

## 1. Visão geral da aplicação

A URL serve uma SPA (Single Page Application) hospedada em S3, sem servidor próprio
de renderização. É a tela que o cliente final vê ao escanear o QR Code de um lote
de rastreabilidade da Koltitrace.

| Item | Valor observado |
|---|---|
| Framework | Vue 3 (build Vite) |
| Bibliotecas | Vue Router 4, Bootstrap 5, jQuery, axios, SweetAlert2, Google Maps JS API |
| Hospedagem | Amazon S3 (header `server: AmazonS3`) |
| Analytics | Google Tag Manager (`GTM-NMDTKZ39`) e Google Analytics (`G-E167FVGTWK`) |
| Entry point | `index.html` → `/assets/index.3a06b0c6.js` (chunk principal) |
| Chunks sob demanda | `HomeView.f7f14db3.js`, `PageNotFound.85f639ab.js`, `Footer.38c7cf86.js`, `config.5c287024.js` |

### Rotas (Vue Router)

A aplicação só define duas rotas — não existe rota `/` literal:

```js
routes: [
  { path: "/:catchAll(.*)", name: "not-found", component: PageNotFound },
  { path: "/:id",           name: "home",      component: HomeView },
]
```

Qualquer caminho que não seja o id de um lote cai no `PageNotFound`.

---

## 2. O parâmetro `id` do link

O segmento após o domínio é o `id` da rota, **texto puro em base64** (não é um
JWT, apesar de parecer um token):

```
YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U  →  app-19654-batch-koltitrace
```

O front-end decodifica esse texto em alguns pontos da UI para decidir
comportamento, sem que isso seja criptografia ou assinatura — é só `atob()`:

- Se o texto decodificado contém a substring `"transaction"`, a UI mostra o aviso
  **"Unable to read QR code"** (indicando que aquele id pertence a outro fluxo do
  app, de transação, não de distribuição) — mas a aplicação **continua** tentando
  buscar os dados de distribuição mesmo assim.
- Se contém `"givaudan"`, `"nestlecocoatrace"` ou `"corporatediageo"`, a UI aplica
  uma skin/branding de cliente corporativo diferente.

**Evidência:** `assets/HomeView.f7f14db3.js`, funções minificadas `Sn`, `un` e o
computed `isGivaudan`.

---

## 3. Fluxo de busca de dados

Esta é a parte mais relevante para o QA. Reconstruída em
`koltitrace-clone/src/aws-store.js` com nomes legíveis; os nomes originais
minificados estão entre parênteses.

```
mounted()
  │
  ├─ fetchGeo(id)            (Sn(env,id,"Geo_"))  → idioma do mapa (não bloqueante)
  │
  └─ fetchDistribution(id)   (Sn(env,id,"Dist_")) → dados de origem/destino do lote
        │
        ├─ 1) GET {cloudfrontURL}/koltitrace-lite/{env}/{prefix}{id}.json?timestamp=...
        │        (bo(env,id,prefix))
        │
        ├─ 2) Se 403 → repete o passo 1 com o padding do base64 invertido
        │        (remove TODOS os "=" finais, ou adiciona "==" se não houver)
        │
        └─ 3) Qualquer falha restante → un(id):
                 • se o id decodificado contém "transaction" → modal "Unable to read QR code"
                 • senão → Pn(id): POST SEM CORPO em
                     {api}/queue/distribution-geolocation?uid={id}
                   com header Authorization (token estático do config.js),
                   mostra o modal em tela cheia "Generating QR Code..." e
                   IGNORA a resposta (erro só vai para console.log)
```

> **Correção em relação à primeira versão deste documento:** o passo 3 não é um
> `GET` que devolve dados. É um `POST` que **enfileira a geração** do arquivo do
> lote (`Pn`, `Dt.post(url, null, {headers})`). A página nunca lê o resultado; o
> usuário volta depois, quando o JSON já existe no S3. Descoberto ao executar o
> clone e conferir `Pn` no bundle original.

- `{env}` é escolhido comparando `window.location.origin` com os valores de
  `config.js`: `prod` em `qr.koltitrace.com`, `staging` em `qr-staging...`, e
  **`devel` para qualquer outro origin, incluindo o próprio domínio de produção
  caso a URL mude** — ver achado F-5.
- `{cloudfrontURL}` = `https://koltiva-qrcode-data.koltivaapi.com`, um CloudFront na
  frente do bucket S3 público `koltiva-qrcode-data` (região `ap-southeast-1`).
- A tentativa de duas paddings diferentes de base64 (passo 2) sugere que a chave do
  objeto no S3 nem sempre corresponde exatamente ao padding que o front-end calcula
  a partir do id da URL — comportamento defensivo, não intencional.
- O host do `POST` do passo 3 é escolhido pelo origin da página:
  `apiProduction` em produção, `apiBastionStaging` em staging e
  `apiBastionDevelopment` para qualquer outro origin (que hoje aponta para o mesmo
  host de produção).
- Qualquer erro na primeira tentativa (não só 403) acaba no passo 3. O retry de
  padding só acontece em 403 — o que é o código que o S3 costuma devolver para uma
  chave inexistente quando o bucket não concede `ListBucket` (inferência, não
  observado na infraestrutura real).
- `fetchGeo` e `fetchDistribution` passam pelo mesmo fluxo; se **ambos** os arquivos
  faltam, uma única visita dispara **dois** `POST`s de enfileiramento.

**Evidência:** `assets/HomeView.f7f14db3.js`, funções minificadas `Sn`, `bo`, `ut`,
`dt`, `Pn`, `un`, `Tl`, e o store Pinia `vo = Rt("aws", {...})`.

---

## 4. `config.js` — configuração exposta ao cliente

O chunk `assets/config.5c287024.js` é carregado por qualquer visitante e contém,
além dos hosts de ambiente, dois valores sensíveis:

- `apiMapKey`: uma chave de navegador do Google Maps (prefixo padrão de chave de API
  do Google), em texto puro, visível a qualquer visitante da página.
- `authorization`: um cabeçalho `Bearer` estático enviado na chamada de fallback da
  API (passo 3 da seção 3). O JWT que ele carrega decodifica para o payload de
  **exemplo público do jwt.io** (assunto `jrocket@example.com`, emissor "Online JWT
  Builder", `exp` correspondente a 23/03/2023 — já expirado).

Nenhum dos dois valores é reproduzido neste relatório, mesmo mascarado, para não
deixar nenhum trecho identificável do segredo no repositório. Os valores completos
estão disponíveis a qualquer parte com acesso ao mesmo link público e podem ser
recuperados a partir dele; entregue-os à Koltiva por um canal interno/privado se
precisarem do valor exato para rotação.

**Hosts adicionais encontrados no mesmo arquivo:**

| Chave | Valor |
|---|---|
| `apiProduction` | `https://apifg.koltitrace.com/api/qr-code` |
| `apiBastionStaging` | `https://fg-node-1-staging.koltitrace.com/api/qr-code` |
| `apiBastionStagingCorporate` | `https://apifg-staging.corporate.koltitrace.com/api/qr-code` |
| `createInvoiceProductionFG` / `...DevelopmentFG` | Integração de pagamento Xendit (`api-traceability(.development).koltiva(api).com`) |
| `markerIconS3` | `https://d3hls3rl2gm0he.cloudfront.net` |

---

## 5. Achados de segurança (QA)

Numerados para referência em relatório. Severidade é uma estimativa inicial —
ajuste conforme o apetite de risco da Koltiva.

### F-1 — Chave do Google Maps exposta no bundle público (Informativo/Baixo)
Qualquer visitante vê `apiMapKey` em texto puro. Isso é esperado para chaves de
navegador, **desde que** a chave esteja restrita por *HTTP referrer* e por API
habilitada (Maps JavaScript API apenas) no Google Cloud Console. Não testamos a
chave. **Recomendação:** confirmar restrições no console do Google; girar a chave
se não houver restrição de referrer.

### F-2 — Token de exemplo do jwt.io usado como credencial de API (Médio)
O header `Authorization` enviado no `POST` de enfileiramento para
`apifg.koltitrace.com` é um valor estático, público, de uma ferramenta de terceiros,
e já expirado desde 2023. Isso sugere uma das duas coisas:
- a API não valida de fato esse token (qualquer bearer serve), ou
- o token nunca foi trocado por um real.
Em qualquer caso, não há autenticação real protegendo esse endpoint do lado do
cliente. **Recomendação:** a API deve emitir e validar tokens de verdade (ou não
exigir nenhum, se o dado é deliberadamente público), e nunca reusar segredos de
exemplo de terceiros.

### F-2b — Visitar um link qualquer dispara escrita no backend (Médio, a confirmar)
Pela lógica de `Pn`/`un` (confirmada no bundle e reproduzida no clone — cenários 2
e 3 da seção 7), **carregar a página com um id inexistente** faz o navegador enviar
um `POST /queue/distribution-geolocation?uid={id}` autenticado só pelo token
estático da F-2, e uma única visita pode enviar **dois** (um para `Geo_`, outro para
`Dist_`). Qualquer pessoa pode montar um link `/<base64 qualquer>` e provocar esse
efeito, sem sessão e sem ser o dono do lote. Se o backend aceitar `uid` arbitrário,
isso permite (a) encher a fila de geração com ids lixo, (b) disparar processamento
para lotes de terceiros e (c) abuso de custo. **Não testado contra o backend real**
— é inferência a partir do código do cliente. **Recomendação:** validar no servidor
que o `uid` corresponde a um lote existente e autorizado antes de enfileirar; limitar
a taxa por origem/IP; idealmente a geração não deveria ser disparável por uma leitura
pública.

### F-3 — Dados de distribuição acessíveis só pelo id do lote, sem autenticação (Médio, a confirmar)
O caminho de leitura (S3/CloudFront) usa só o `id` da URL como chave de acesso ao
JSON do lote (e o `POST` de enfileiramento, ver F-2b, também). Esse `id` é texto em base64 **sem
assinatura, sem HMAC, sem nada que impeça adivinhação** — é só codificação, não
controle de acesso. Quem souber (ou adivinhar) o padrão de nomenclatura dos lotes
(`app-{N}-batch-koltitrace`) pode, em tese, montar outros ids e consultar outros
lotes. **Não testamos isso** — nenhuma enumeração foi feita. **Recomendação:**
confirmar com a Koltiva se os dados de distribuição são deliberadamente públicos
(parece ser o design: é a tela que qualquer consumidor final vê ao escanear o QR).
Se não forem, o controle de acesso real precisa estar no backend, não no
"segredo" do id.

### F-4 — Ambientes de staging/desenvolvimento referenciados no bundle de produção (Baixo)
`config.js` do ambiente de produção lista os hosts de staging
(`qr-staging.koltitrace.com`, `fg-node-1-staging.koltitrace.com`,
`apifg-staging.corporate.koltitrace.com`). Isso não é uma falha por si só, mas
amplia a superfície de reconhecimento de quem analisa o bundle público.
**Recomendação:** avaliar se staging precisa estar acessível publicamente e se os
nomes de host devem aparecer no bundle de produção.

### F-5 — Detecção de ambiente insegura por padrão ("devel" como fallback) (Baixo)
```js
determineEnvironmentKey() {
  const origin = window.location.origin;
  return origin === envProduction ? "prod"
       : origin === envBastionStaging ? "staging"
       : "devel";
}
```
Qualquer origin que não bata exatamente com os dois valores conhecidos cai em
`"devel"`, inclusive um domínio malicioso que sirva uma cópia do bundle
(clickjacking/typosquatting), ou qualquer alteração futura de domínio sem
atualizar essa lista. Não é exploração direta, mas é uma lógica frágil.
**Recomendação:** tratar ambiente desconhecido como erro explícito, não como
fallback silencioso de desenvolvimento.

### F-6 — Fluxo de pagamento (Xendit) documentado mas não auditado (Informativo)
`config.js` referencia criação de fatura e callback do Xendit
(`api-traceability.koltiva.com/xendit-create-invoice` e `-callback`), com taxas
fixas no código (`chargeXenditPercentageCreditCard: 2.9`). Não investigamos esse
fluxo além de mapear os hosts — está fora do escopo desta análise de front-end de
QR. **Recomendação:** se relevante ao escopo do QA, tratar como investigação
separada (o fluxo de pagamento normalmente tem superfície de risco maior que a
tela de rastreabilidade).

---

## 6. O que não foi testado (fora do escopo desta análise)

- Nenhuma chamada real foi feita a `apifg.koltitrace.com`, ao bucket/CloudFront de
  dados, ou aos endpoints do Xendit.
- Nenhuma enumeração de outros `id`s/lotes.
- Nenhum teste de autenticação, autorização, injeção, ou carga.
- A chave do Google Maps não foi usada nem validada.

Essas ações exigiriam execução de rede contra a infraestrutura real da Koltiva e
devem ser conduzidas no ambiente de teste autorizado do QA, não a partir desta
sessão.

---

## 7. Execução e observações

O clone (`koltitrace-clone/`) foi servido localmente e executado em Chromium
headless (Playwright), com as respostas de rede simuladas por interceptação
(`page.route`) para forçar cada caminho do fluxo. **Isto verifica que o clone
implementa a lógica extraída do bundle; não é observação do sistema real**, cujo
comportamento só foi analisado estaticamente.

| # | Cenário | Requisições observadas | Resultado na UI |
|---|---|---|---|
| 1 | Lote válido | `GET Geo_<id>` 200 → `GET Dist_<id>` 200 | Mapa com marcadores de origem e destino + JSON do lote |
| 2 | `Dist_` devolve 403 (id com padding `==`) | `GET Geo_` 404 → **POST** queue → `GET Dist_<id>==` 403 → `GET Dist_<id>` (sem `=`) 403 → **POST** queue | "Generating QR Code..." |
| 3 | Id inexistente (404 em tudo) | `GET Geo_` 404 → **POST** queue → `GET Dist_` 404 → **POST** queue | "Generating QR Code..." |
| 4 | Id cujo texto contém `transaction` | `GET Geo_` 404, `GET Dist_` 404, nenhum POST | "Unable to read QR code" |
| 5 | Rota desconhecida (`/#/`) | nenhuma | "Page not Found" |

Observações do que a execução mostrou:

- **O retry de padding só ocorre em 403** e remove *todos* os `=` finais (o
  primeiro rascunho do clone removia só um — corrigido ao comparar com o bundle).
- **O `POST` de enfileiramento sempre leva o header `Authorization`**, confirmado
  no cenário 2 e 3 (header presente).
- **Uma visita com id sem arquivo gera dois `POST`s** (cenários 2 e 3) — base da
  F-2b.
- **Id com `transaction` nunca chega ao `POST`**: o aviso substitui o fluxo de geração.
- **A UI do original não lê o resultado do `POST`**: o estado final é sempre o modal
  de geração; não há polling.
- Nenhum erro de JavaScript em nenhum dos cenários.

Limitação: a ordem exata entre o modal do `POST` e a resolução da segunda busca, e o
tratamento do spinner no original quando `fetchGeo` rejeita, foram reproduzidos de
forma equivalente, não idêntica ao milissegundo.

## 8. Artefatos desta análise

- `koltitrace-clone/` — reconstrução funcional do front-end (sem credenciais reais,
  sem chamadas às hosts reais; ver `koltitrace-clone/README.md`).
- Este documento.

## 9. Referências de evidência (REA)

- `rea analyze-javascript-application` sobre os arquivos públicos baixados de
  `qr.koltitrace.com` (HTML + `index.*.js`) — grafo de módulos/exports confirmando
  Vue 3 + estrutura de chunks.
- Leitura manual complementar de `HomeView.f7f14db3.js` e `config.5c287024.js`
  (download público, sem autenticação) para reconstruir a lógica de fetch, as
  rotas e os valores de configuração citados acima.
