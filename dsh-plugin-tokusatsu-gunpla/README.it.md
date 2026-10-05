# Assistente per l'identificazione di cinture Kamen Rider DX e Gunpla Bandai

**Plugin DeepSeek Harness** · Assistente a doppio uso Tokusatsu + modellismo in plastica · riconoscimento sul desktop, il telefono serve solo a scattare foto

[简体中文](README.md) [English](README.en.md) [English (UK)](README.en-GB.md) [日本語](README.ja.md) [Deutsch](README.de.md) [Français](README.fr.md) [Español](README.es.md) [Português](README.pt.md) [한국어](README.ko.md) [Русский](README.ru.md) | Italiano

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **Sulle traduzioni**: questa versione italiana è tradotta automaticamente e riletta dalla comunità, quindi la formulazione può essere imprecisa. La **[versione in cinese semplificato](README.md) è quella autorevole**: in caso di divergenza, fa fede quella. Le segnalazioni di errori di terminologia (per esempio DX, CSM, Kaitai-Shou-Ki o i livelli di fulmine su Bilibili) sono benvenute come pull request.

---

## Di cosa si tratta

Un assistente per l'identificazione che gira dentro DeepSeek Harness, costruito per esattamente due compiti:

- **Cinture Kamen Rider**: DX o CSM? È un KO?
- **Kit Gunpla Bandai**: EG / HG / RG / MG / PG / MB / Dissection Craft Machine — di quale grado si tratta? È un bootleg?

Una regola di progettazione vale in tutto il plugin: **a parte il passo "scrivi una recensione", nulla chiama un modello di grandi dimensioni.** La checklist fotografica, il riconoscimento, il verdetto DX/CSM, le consultazioni della base di conoscenza, la classificazione delle fonti e il filtraggio delle fake news avvengono tutti su questa macchina, a zero token. I risultati finiscono in una cache locale, quindi ri-identificare lo stesso gruppo di foto non ricalcola nulla.

> Questo plugin non è uno strumento ufficiale. L'identificazione è solo indicativa — vedi [Dichiarazione di non responsabilità](#dichiarazione-di-non-responsabilità).

---

## Cosa sa fare

### Requisiti fotografici obbligatori (questo è il cuore, non un suggerimento)

Il plugin **blocca** le richieste prive di prove invece di restituire una risposta inesatta:

| Categoria | Da fotografare obbligatoriamente | Quando manca la scatola / non è possibile ottemperare |
|---|---|---|
| **Cintura** | Buckle **rimosso e fotografato separatamente**, davanti e dietro (il retro deve mostrare la targhetta); dispositivo di trasformazione **rimosso e fotografato separatamente** | Aggiungi l'intera cintura, il vano batterie, il suono di trasformazione |
| **Gunpla** | **Fronte della scatola** (con il marchio Bandai e la fascia colorata del grado) | Più angolazioni + aree caratteristiche + prova d'acquisto → se non basta, **inserisci il modello manualmente** |
| Altro | Marca, numero di parte, primo piano della targhetta | Più angolazioni |

Il promemoria compare in tre punti, come da specifica: **testo grande nella guida iniziale**, **banner persistente nell'interfaccia di acquisizione** (non solo in caso di errore) e **ancora una volta quando l'identificazione fallisce**.

### Logica di discriminazione DX / CSM

Il punteggio segue l'ordine **materiale → dimensioni → dettagli → domanda sul suono**, e ogni passo ha criteri espliciti:

- **Materiale**: parti in die-cast metallico, fodera in pelle → lato CSM
- **Dimensioni**: una taglia più grande e più spessa rispetto a DX → lato CSM
- **Dettagli**: incisione laser, numeri di serie individuali, targhetta metallica → lato CSM; marchio stampato a iniezione più anno → lato DX
- **Suono**: dialoghi / BGM → in pratica non è DX; solo il suono di trasformazione e il suono della mossa finale → lato DX

Quando due punteggi risultano vicini, il plugin **non tira a indovinare**: restituisce "sospetto", elenca i candidati tra cui l'utente può scegliere e scrive la scelta dell'utente nell'**archivio delle correzioni** (priorità massima; gli aggiornamenti successivi non lo sovrascrivono mai).

### Fake news e classificazione delle fonti

L'affidabilità di una fonte è **derivata**, non assegnata a mano:

```
Sito ufficiale > account ufficiale X/YouTube (VPN necessaria) > account ufficiale cinese (fulmine blu + soggetto verificato + avatar)
> elenco ufficiale delle uscite > video promozionale ufficiale di quell'anno > grande rivenditore / wiki mainstream
> post/blog di quell'epoca > creator con fulmine giallo > creator semplice > chat di gruppo
```

**Riconoscimento degli account Bilibili**: fulmine blu = ufficiale; fulmine giallo = solo riferimento; nessun fulmine = livello minimo.
Un fulmine blu **non basta** — l'account deve avere contemporaneamente un soggetto verificato, un avatar personalizzato e un titolo **e** una descrizione che riflettano entrambi un tema giocattolo/modellismo. Se manca anche uno solo di questi elementi, il plugin **apre una finestra di dialogo per la conferma dell'utente**, e la conferma finisce nella whitelist dell'utente, così non chiederà più.

**Regola di ingresso**: almeno **2 fonti indipendenti** devono concordare, e almeno 1 di esse deve essere una fonte archiviabile. Altrimenti la voce è contrassegnata come "non confermata". **I contenuti generati dall'IA sono solo per visualizzazione e non vengono mai archiviati.**

**Motori di ricerca**: prima Bing cinese; il punto d'ingresso Baidu è opzionale e viene sempre etichettato "non verificato" quando mostrato; Google per i mercati non cinesi, Yandex per il russo; **360 / Sogou / 2345 non vengono mai usati**.

### Modalità collezionista (opzionale)

Per impostazione predefinita il plugin copre solo gli articoli mainstream. Quando è attivata include anche:

- **Gunpla**: PG / MGEX / MB / Dissection Craft Machine / RE100 / FULL MECHANICS / HI-RESOLUTION / edizioni limitate / non-Bandai esteri / GK
- **Cinture**: CSM / CS / candy toys / gashapon / edizioni limitate / accessori oscuri

### Multilingue

Supporto completo: **cinese semplificato / cinese tradizionale / inglese / giapponese**.
Traduzione dell'interfaccia: coreano, francese, spagnolo, portoghese, russo, cantonese, vietnamita, tedesco, italiano, olandese, polacco.
Ogni lingua ricade sull'inglese, e una chiave mancante non espone mai la chiave grezza.

---

## Installazione

### Opzione 1: inviare il link del repository direttamente a DSH (consigliato)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH lo installa nel profilo tramite l'`install_bundle` di `plugin_manager`. È l'**unico** percorso di installazione supportato.

### Opzione 2: clonarlo, poi lasciare che DSH installi dalla directory locale

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Poi passa a `plugin_manager` il **percorso assoluto di quella directory**:

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### Non installarlo a mano

Quanto segue sembra funzionare, e invece fa sparire il plugin:

- creare un symlink dentro i `node_modules` del profilo (una junction su Windows)
- scrivere a mano una riga nel `cordis.patch.yml` del profilo
- copiare il pacchetto sotto `$DSH_HOME`

Due motivi, entrambi difficili da diagnosticare da soli:

1. **La risoluzione delle dipendenze fallisce.** Il loader risolve il pacchetto tramite il suo percorso REALE (i symlink vengono sciolti), quindi Node cerca `node_modules` risalendo dal tuo workspace, dove i pacchetti DSH non ci sono. Neppure rattopparne qualcuno basta: `@deepseek-ai/dsh-tools` importa a sua volta `dsh-scope`, `dsh-sandbox`, `dsh-llm` e altri che sono **assenti dal suo stesso package.json**, quindi serve l'intero albero.
2. **Il loader ricorda il fallimento.** Quando una riga non riesce ad attivarsi, il loader persiste `disabled: true` nel profilo, e ogni avvio successivo la salta del tutto.

Entrambi si presentano allo stesso modo: **nessuna interfaccia e nessuno strumento**, senza alcun log. Vedi [docs/INSTALL.md](docs/INSTALL.md) per distinguerli.

Vedi [docs/INSTALL.md](docs/INSTALL.md) per i dettagli.

---

## Configurazione

Tutto si modifica nel `cordis.patch.yml` del profilo:

| Campo | Predefinito | Descrizione |
|---|---|---|
| `richMode` | `false` | Modalità collezionista |
| `visionEnabled` | `true` | Se usare un endpoint di visione locale |
| `visionBaseUrl` | `''` | Endpoint compatibile OpenAI; lascia vuoto per sondare automaticamente `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | Nome del modello; lascia vuoto per usare il primo che l'endpoint segnala |
| `visionTimeoutMs` | `120000` | Timeout dell'inferenza locale |
| `visionMaxImages` | `6` | Limite di immagini per una singola identificazione |
| `cacheTtlMs` | `86400000` | Durata della cache di identificazione, 0 la disattiva |
| `searchLanguage` | `'zh'` | Lingua del mercato di ricerca |
| `allowBaidu` | `false` | Se offrire il punto d'ingresso Baidu (sempre etichettato "non verificato") |
| `showCompliance` | `false` | Se mostrare le note GDPR / EU AI Act |
| `requireAcknowledgement` | `true` | Se l'avvertenza legale deve essere accettata prima |

### Sul "riconoscimento con piccolo modello locale"

Il plugin **non** carica mai le tue foto nel cloud. Chiama un endpoint di visione compatibile OpenAI che è **già in esecuzione sulla tua macchina**:

```bash
# Esempio: Ollama
ollama pull qwen2.5-vl
ollama serve        # ascolta su 127.0.0.1:11434
```

Quando l'endpoint non è disponibile non genera errori né chiama l'esterno — degrada automaticamente al percorso **checklist fotografica + inserimento manuale del modello**, sempre a zero token.

---

## I quattro strumenti locali

Una volta installato il plugin, l'assistente può usare questi quattro strumenti. **Vengono eseguiti tutti localmente**:

| Strumento | Scopo |
|---|---|
| `gear_identify` | Identificazione + verdetto sul bootleg + giudizio sull'edizione + confidenza; il risultato viene messo in cache e pubblicato nell'interfaccia |
| `gear_checklist` | Genera/verifica la checklist fotografica e individua cosa manca ancora |
| `gear_decide_edition` | Punteggio DX / CSM e catena di domande di approfondimento |
| `gear_knowledge` | Consultazione della base di conoscenza, piano di ricerca, punteggio delle fonti, verifica incrociata, scritture nell'archivio delle correzioni, scritture nell'archivio locale |

I valori di ritorno degli strumenti portano già la conclusione e la catena di prove, quindi l'assistente **non** deve indovinare di nuovo il modello — anche questa è la chiave per risparmiare token.

---

## Interfaccia

Tre superfici UI, tutte registrate tramite il sistema di slot di Harness:

1. **Guida iniziale** (slot `conversation.input.dock`, sopra l'area di input della conversazione): requisiti fotografici in testo grande + casella di accettazione dell'avvertenza legale + note di conformità + interruttore della Modalità collezionista. **L'interfaccia di acquisizione non compare finché il consenso non è spuntato.**
2. **Guida all'acquisizione** (slot `conversation.composer.dock`, persistente): cambio di categoria, banner di promemoria persistente, checklist fotografica con caselle selezionabili, suggerimenti in tempo reale su cosa manca ancora.
3. **Pannello dei risultati + pagina delle impostazioni** (slot `settings.section`): le schede dei risultati portano confidenza e prove, e i casi sospetti permettono di scegliere la correzione; la pagina delle impostazioni gestisce lingua, Modalità collezionista, punto d'ingresso Baidu, endpoint locale, avvertenza legale e note di conformità.

---

## Ponte QQ (opzionale)

NapCat / Lagrange, oppure solo inoltro di messaggi. **Funziona senza QQ; le funzionalità principali non dipendono da QQ.**

> ⚠️ Il ponte QQ comporta un **rischio di ban**; il rischio dell'account è a carico dell'utente.

---

## Sviluppo

```bash
node scripts/smoke.mjs         # 69 checks: photo checklist, decision tree, bootleg verdict, source grading, end to end
node scripts/client-test.mjs   # 43 checks: client contract, four-language rendering, slot registration, i18n fallback
```

Nessuno dei due test richiede rete o modello.

```
lib/
  index.js      plugin entry, config schema, session projection (results to the UI)
  tools.js      the four model-visible tools
  identify.js   main identification flow (evidence → bootleg gate → match → judgement → confidence)
  checklist.js  photo requirement engine
  decide.js     DX/CSM decision tree
  sources.js    source grading, Bilibili verdicts, cross-checking, search engine routing
  vision.js     local vision endpoint client + degradation
  store.js      three-tier knowledge base (built-in seed / verified / user corrections)
  i18n.js       language catalogue, disclaimer, compliance notes
  client.js     the browser half (startup guide / capture guide / result panel / settings page)
data/
  seed-catalog.json       built-in entries and criteria
  official-whitelist.json official verified-subject whitelist
```

Directory dei dati locali: `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Eliminarla è il modo per esercitare il tuo diritto alla cancellazione.

---

## Dichiarazione di non responsabilità

Collocate in tre punti: la guida iniziale (dietro una casella di controllo), questo README e la pagina delle impostazioni:

1. **L'identificazione è solo indicativa**: questo plugin non è uno strumento ufficiale e i suoi risultati possono essere errati.
2. **Non ufficiale**: nessun legame, autorizzazione o approvazione da parte di Bandai, Toei, Tsuburaya o di qualsiasi produttore.
3. **I dati provengono da fonti pubbliche**: le schede sono compilate da materiale pubblico e possono essere obsolete o inesatte; prevalgono sempre le informazioni ufficiali.
4. **Il ponte con QQ comporta un rischio di ban**: se attivi l'inoltro di QQ, il rischio dell'account è tuo.
5. **I contenuti IA non sono consigli d'acquisto**: recensioni o descrizioni generate non costituiscono raccomandazioni di investimento o di acquisto.
6. **Open source, fornito così com'è**: nessuna garanzia, esplicita o implicita; uso a proprio rischio.
7. **Nessuna raccomandazione di prodotti nazionali, KO o di terze parti estere**: rilevare un falso è un avviso, non una raccomandazione.

### GDPR / EU AI Act (utenti UE)

- **GDPR**: i dati di identificazione restano su questa macchina per impostazione predefinita (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), e il plugin non carica né le foto né la base di conoscenza. Eliminare la directory dei dati locali esercita il tuo diritto alla cancellazione; il plugin non costruisce profili utente.
- **EU AI Act**: questo plugin è un sistema di IA open source per uso non ad alto rischio, che svolge solo identificazione assistita e organizzazione di informazioni. Tutti i contenuti generati dall'IA sono etichettati con il livello della loro fonte e sono solo per visualizzazione, mai archiviati.
- **Trasparenza**: i risultati arrivano con confidenza e catena di prove, e le correzioni dell'utente prevalgono sui risultati automatici.

---

## Promozione e community

- **GitHub**: repository pubblico, topic `dsh-plugin`, inviato al DSH Plugin Hub
- **Gruppi QQ**: gruppo principale **419573550** · gruppo diramazione **579938880**
- **Bilibili**: i video hanno superato la revisione, la descrizione è ancora da completare; i sottotitoli multilingue vengono portati su YouTube; i video hanno la filigrana

### Note sulle insidie

- Creare un gruppo QQ richiede la verifica con nome reale
- Se GitHub è bloccato, tieni pronti i mirror Gitee / jsDelivr e cambia sorgente su un 404
- Per il dirottamento del browser, controlla prima 360 / 2345; consigliati: Kaspersky Free / Huorong / il Tencent PC Manager minimale, e usa Geek per disinstallare; rimuovere i residui di 360 richiede privilegi di amministratore
- L'EU AI Act esenta sostanzialmente "open source + dati locali"
- Per il russo, usa Yandex / VK / RuTube
- I README sono tradotti automaticamente più riletti dalla community, e **la versione cinese è quella autorevole**

---

## Licenza

[MIT](LICENSE)

Questo plugin non raccomanda alcun prodotto nazionale, KO o di terze parti estero. Rilevare un falso è un avviso, non una raccomandazione.
