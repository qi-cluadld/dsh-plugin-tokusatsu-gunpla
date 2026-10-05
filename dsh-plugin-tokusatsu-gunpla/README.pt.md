# Assistente de Identificação de Cintos Kamen Rider DX e Gunpla da Bandai

**Plugin do DeepSeek Harness** · Assistente de dupla utilização Tokusatsu + modelos plásticos · reconhecimento no computador, o telemóvel só tira fotografias

Português | [简体中文](README.md) [English](README.en.md) [English (UK)](README.en-GB.md) [日本語](README.ja.md) [Deutsch](README.de.md) [Français](README.fr.md) [Español](README.es.md) [한국어](README.ko.md) [Русский](README.ru.md) [Italiano](README.it.md)

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## O que é isto

Um assistente de identificação que corre dentro do DeepSeek Harness, feito exatamente para dois trabalhos:

- **Cintos Kamen Rider**: DX ou CSM? É um KO?
- **Kits Gunpla da Bandai**: EG / HG / RG / MG / PG / MB / Dissection Craft Machine — que grade é? É uma imitação?

Uma regra de design mantém-se em todo o projeto: **exceto no passo "escrever uma análise", nada chama um modelo grande.** A lista de fotografias, o reconhecimento, a decisão DX/CSM, as consultas à base de conhecimento, a classificação de fontes e o filtro de notícias falsas acontecem todos nesta máquina, a zero tokens. Os resultados vão para uma cache local, por isso voltar a identificar o mesmo lote de fotografias não recalcula nada.

> Este plugin não é uma ferramenta oficial. A identificação é apenas uma referência — ver [Aviso legal](#aviso-legal).

---

## O que consegue fazer

### Requisitos obrigatórios de fotografias (este é o núcleo, não uma sugestão)

O plugin **bloqueia** pedidos que não tenham evidência em vez de devolver uma resposta incorreta:

| Categoria | Obrigatório fotografar | Quando não há caixa / não é possível cumprir |
|---|---|---|
| **Cinto** | Fivela **removida e fotografada separadamente**, frente e verso (o verso tem de mostrar a chapa de identificação); dispositivo de transformação **removido e fotografado separadamente** | Acrescentar o cinto completo, o compartimento das pilhas, o som de transformação |
| **Gunpla** | **Frente da caixa** (com a marca Bandai e a faixa de cor do grade) | Vários ângulos + zonas de características + comprovativo de compra → se nada disso resultar, **introduzir o modelo manualmente** |
| Outros | Marca, número de peça, close-up da chapa de identificação | Vários ângulos |

O aviso aparece em três locais, de acordo com a especificação: **texto grande no guia de arranque**, **um banner persistente na interface de captura** (não apenas em caso de falha) e **mais uma vez quando a identificação falha**.

### Lógica de distinção DX / CSM

A pontuação segue a ordem **material → tamanho → detalhe → perguntar sobre o som**, e cada passo tem critérios explícitos:

- **Material**: peças de metal fundido (die-cast), forro de pele → lado CSM
- **Tamanho**: um tamanho maior e mais grosso do que o DX → lado CSM
- **Detalhe**: gravação a laser, números de série individuais, chapa de identificação metálica → lado CSM; marca moldada por injeção mais o ano → lado DX
- **Som**: diálogos / BGM → basicamente não é DX; apenas o som de transformação e o som do golpe final → lado DX

Quando duas pontuações ficam próximas, o plugin **não adivinha**: devolve "suspeito", lista os candidatos para o utilizador escolher e escreve a escolha do utilizador no **registo de correções** (prioridade máxima; atualizações posteriores nunca o substituem).

### Notícias falsas e classificação de fontes

A confiança da fonte é **derivada**, não atribuída:

```
Site oficial > conta oficial no X/YouTube (VPN necessária) > conta oficial nacional (raio azul + entidade verificada + avatar)
> lista oficial de lançamentos > vídeo promocional oficial desse ano > grande retalhista / wiki de referência
> publicações/blogs dessa época > criador com raio amarelo > criador comum > chat de grupo
```

**Reconhecimento de contas Bilibili**: raio azul = oficial; raio amarelo = apenas referência; sem raio = o mais baixo.
Um raio azul **não é suficiente** — a conta tem de ter simultaneamente uma entidade verificada, um avatar personalizado, e um título **e** uma descrição que reflitam ambos um tema de brinquedos/modelos. Se faltar um destes, o plugin **abre uma caixa de diálogo para o utilizador confirmar**, e a confirmação vai para a lista de autorizados do utilizador para nunca mais perguntar.

**Regra de entrada**: é necessário que pelo menos **2 fontes independentes** concordem, e pelo menos 1 delas tem de ser uma fonte arquivável. Caso contrário, a entrada é marcada como "não confirmada". **O conteúdo gerado por IA é apenas para visualização e nunca é arquivado.** O conteúdo de IA é apenas exibido e nunca é registado.

**Motores de busca**: Bing chinês primeiro; o ponto de entrada do Baidu é opcional e aparece sempre rotulado como "não verificado"; Google para mercados não chineses, Yandex para russo; **360 / Sogou / 2345 nunca são usados**.

### Modo colecionador (opcional)

Por predefinição, o plugin cobre apenas artigos de grande consumo. Quando ativado, inclui também:

- **Gunpla**: PG / MGEX / MB / Dissection Craft Machine / RE100 / FULL MECHANICS / HI-RESOLUTION / edições limitadas / não-Bandai estrangeiros / GK
- **Cintos**: CSM / CS / brinquedos de guloseima / gashapon / edições limitadas / acessórios obscuros

### Multilingue

Suporte completo: **chinês simplificado / chinês tradicional / inglês / japonês**.
Tradução da interface: coreano, francês, espanhol, português, russo, cantonês, vietnamita, alemão, italiano, neerlandês, polaco.
Todas as línguas recorrem ao inglês como fallback, e uma chave em falta nunca expõe a chave em bruto.

---

## Instalação

### Opção 1: enviar o link do repositório diretamente para o DSH (recomendado)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

O DSH instala-o no perfil através do `install_bundle` do `plugin_manager`. Esse é o **único** caminho de instalação suportado.

### Opção 2: clonar e depois deixar o DSH instalar a partir do diretório local

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Depois entregue o **caminho absoluto desse diretório** ao `plugin_manager`:

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### Não instalar à mão

O seguinte parece funcionar e faz o plugin desaparecer:

- criar uma ligação simbólica dentro de `node_modules` do perfil (uma junction no Windows)
- escrever à mão uma linha no `cordis.patch.yml` do perfil
- copiar o pacote para dentro de `$DSH_HOME`

Dois motivos, ambos difíceis de diagnosticar sozinho:

1. **A resolução de dependências falha.** O loader resolve o pacote pelo seu caminho REAL (as ligações simbólicas são desfeitas), por isso o Node procura `node_modules` para cima a partir do seu workspace, onde os pacotes DSH não estão. Corrigir alguns à mão também não chega: o próprio `@deepseek-ai/dsh-tools` importa `dsh-scope`, `dsh-sandbox`, `dsh-llm` e outros que estão **ausentes do seu próprio package.json**, por isso é necessária a árvore completa.
2. **O loader lembra-se da falha.** Quando uma linha falha a ativação, o loader persiste `disabled: true` de volta no perfil, e todos os arranques seguintes saltam-na por completo.

Ambas se apresentam de forma idêntica: **sem interface e sem ferramentas**, sem qualquer log. Ver [docs/INSTALL.md](docs/INSTALL.md) para saber como as distinguir.

Ver [docs/INSTALL.md](docs/INSTALL.md) para mais detalhes.

---

## Configuração

Tudo se altera no `cordis.patch.yml` do perfil:

| Campo | Predefinição | Descrição |
|---|---|---|
| `richMode` | `false` | Modo colecionador |
| `visionEnabled` | `true` | Se deve usar um endpoint de visão local |
| `visionBaseUrl` | `''` | Endpoint compatível com OpenAI; deixar vazio para sondar automaticamente `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | Nome do modelo; deixar vazio para usar o primeiro que o endpoint reportar |
| `visionTimeoutMs` | `120000` | Timeout da inferência local |
| `visionMaxImages` | `6` | Limite de imagens para uma única identificação |
| `cacheTtlMs` | `86400000` | Duração da cache de identificação, 0 desativa-a |
| `searchLanguage` | `'zh'` | Idioma do mercado de busca |
| `allowBaidu` | `false` | Se deve oferecer o ponto de entrada do Baidu (sempre rotulado "não verificado") |
| `showCompliance` | `false` | Se deve mostrar as notas do GDPR / EU AI Act |
| `requireAcknowledgement` | `true` | Se o aviso legal tem de ser aceite primeiro |

### Sobre o "reconhecimento com modelo pequeno local"

O plugin **nunca** envia as suas fotografias para a nuvem. Chama um endpoint de visão compatível com OpenAI que **já está a correr na sua própria máquina**:

```bash
# Exemplo: Ollama
ollama pull qwen2.5-vl
ollama serve        # escuta em 127.0.0.1:11434
```

Quando o endpoint não está disponível, o plugin nem dá erro nem chama o exterior — degrada automaticamente para o caminho de **lista de fotografias + introdução manual do modelo**, ainda a zero tokens.

---

## As quatro ferramentas locais

Depois de o plugin estar instalado, o assistente pode usar estas quatro ferramentas. **Todas são executadas localmente**:

| Ferramenta | Finalidade |
|---|---|
| `gear_identify` | Identificação + veredicto de contrafação + avaliação de edição + confiança; o resultado é colocado em cache e publicado na interface |
| `gear_checklist` | Gerar/verificar a lista de fotografias e determinar o que ainda falta |
| `gear_decide_edition` | Pontuação DX / CSM e cadeia de perguntas de seguimento |
| `gear_knowledge` | Consulta à base de conhecimento, plano de busca, pontuação de fontes, verificação cruzada, escritas no registo de correções, escritas no registo local |

Os valores de retorno das ferramentas já trazem a conclusão e a cadeia de evidências, por isso o assistente **não** tem de adivinhar o modelo outra vez — essa é também a chave para poupar tokens.

---

## Interface

Três superfícies de UI, todas registadas através do sistema de slots do Harness (`conversation.input.dock`, `conversation.composer.dock`, `settings.section`):

1. **Guia de arranque** (acima da área de entrada da conversa): requisitos de fotografias em texto grande + caixa de verificação do aviso legal + notas de conformidade + botão do Modo colecionador. **A interface de captura não aparece enquanto o consentimento não estiver assinalado.**
2. **Guia de captura** (persistente): troca de categoria, banner de aviso persistente, lista de fotografias verificável, dicas em tempo real sobre o que ainda falta.
3. **Painel de resultados + página de definições**: os cartões de resultado trazem confiança e evidência, e os casos suspeitos permitem escolher a correção; a página de definições gere o idioma, o Modo colecionador, o ponto de entrada do Baidu, o endpoint local, o aviso legal e as notas de conformidade.

---

## Ponte com o QQ (opcional)

NapCat / Lagrange, ou apenas reencaminhamento de mensagens. **Funciona sem QQ; as funcionalidades principais não dependem do QQ.**

> ⚠️ A ponte com o QQ envolve **risco de bloqueio**; o risco da conta é suportado pelo utilizador.

---

## Desenvolvimento

```bash
node scripts/smoke.mjs         # 69 verificações: lista de fotografias, árvore de decisão, veredicto de contrafação, classificação de fontes, ponta a ponta
node scripts/client-test.mjs   # 43 verificações: contrato do cliente, renderização em quatro línguas, registo de slots, fallback de i18n
```

Nenhum dos testes precisa de rede nem de um modelo.

```
lib/
  index.js      entrada do plugin, esquema de configuração, projeção de sessão (resultados para a interface)
  tools.js      as quatro ferramentas visíveis ao modelo
  identify.js   fluxo principal de identificação (evidência → portão de contrafação → correspondência → julgamento → confiança)
  checklist.js  motor de requisitos de fotografias
  decide.js     árvore de decisão DX/CSM
  sources.js    classificação de fontes, veredictos da Bilibili, verificação cruzada, encaminhamento de motores de busca
  vision.js     cliente do endpoint de visão local + degradação
  store.js      base de conhecimento em três níveis (semente incorporada / verificado / correções do utilizador)
  i18n.js       catálogo de idiomas, aviso legal, notas de conformidade
  client.js     a metade do navegador (guia de arranque / guia de captura / painel de resultados / página de definições)
data/
  seed-catalog.json       entradas e critérios incorporados
  official-whitelist.json lista de entidades verificadas oficiais
```

Diretório de dados local: `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Apagá-lo é a forma de exercer o seu direito ao apagamento.

---

## Aviso legal

Colocado em três locais: o guia de arranque (atrás de uma caixa de verificação), este README e a página de definições:

1. **A identificação é apenas uma referência**: este plugin não é uma ferramenta oficial e os seus resultados podem estar errados.
2. **Não oficial**: sem qualquer vínculo, autorização ou aval da Bandai, Toei, Tsuburaya ou de qualquer fabricante.
3. **Os dados vêm de fontes públicas**: as fichas são compiladas a partir de material público e podem estar desatualizadas ou incorretas; a informação oficial prevalece sempre.
4. **A ponte com o QQ envolve risco de bloqueio**: se ativar o encaminhamento de QQ, o risco da conta é seu.
5. **O conteúdo de IA não é aconselhamento de compra**: avaliações ou descrições geradas não são recomendações de investimento ou de compra.
6. **Código aberto, fornecido tal como está**: sem qualquer garantia, expressa ou implícita; utilização por sua conta e risco.
7. **Sem aval a produtos nacionais, KO ou de terceiros estrangeiros**: detetar uma falsificação é um aviso, não uma recomendação.

### GDPR / EU AI Act (utilizadores da UE)

- **GDPR**: os dados de identificação ficam nesta máquina por predefinição (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), e o plugin não envia nem as fotografias nem a base de conhecimento. Apagar o diretório de dados local exerce o seu direito ao apagamento; o plugin não cria perfis de utilizador.
- **EU AI Act**: este plugin é um sistema de IA de código aberto para uso não de alto risco, que faz apenas identificação assistida e organização de informação. Todo o conteúdo gerado por IA é rotulado com o seu nível de fonte e é apenas para visualização, nunca arquivado.
- **Transparência**: os resultados vêm com confiança e uma cadeia de evidências, e as correções do utilizador têm prioridade sobre os resultados automáticos.

---

## Promoção e comunidade

- **GitHub**: repositório público, tópico `dsh-plugin`, submetido ao DSH Plugin Hub
- **Grupos QQ**: grupo principal **419573550** · grupo secundário **579938880**
- **Bilibili**: os vídeos passaram a revisão, a descrição ainda está por preencher; as legendas multilingues são transferidas para o YouTube; os vídeos têm marca de água

### Notas de armadilhas

- Criar um grupo QQ exige verificação de identidade real
- Se o GitHub estiver bloqueado, mantenha espelhos no Gitee / jsDelivr prontos e mude de fonte num 404
- Para sequestro do navegador, verifique primeiro o 360 / 2345; recomendado: Kaspersky Free / Huorong / o Tencent PC Manager mínimo, e use o Geek para desinstalar; remover restos do 360 precisa de direitos de administrador
- O EU AI Act isenta basicamente "código aberto + dados locais"
- Para russo, use Yandex / VK / RuTube
- Os READMEs são traduzidos automaticamente mais revisão da comunidade, e **a versão chinesa é a autoritativa**

---

## Licença

[MIT](LICENSE)

Este plugin não dá aval a qualquer produto nacional, KO ou de terceiros estrangeiros. Detetar uma falsificação é um aviso, não uma recomendação.
