# Kamen Rider DX Belt & Bandai Gunpla Identification Assistant

**DeepSeek Harness plugin** · Tokusatsu + plastic-model dual-purpose assistant · recognition on the desktop, the phone only takes photos

[简体中文](README.md) | English | [English (UK)](README.en-GB.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [한국어](README.ko.md) | [Русский](README.ru.md) | [Italiano](README.it.md)

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **About the translations**: this English edition is machine-translated plus community proofreading, so wording may be imprecise. The **[Simplified Chinese edition](README.md) is authoritative** — where the two disagree, follow it. Terminology errors (especially fan-community terms such as DX, CSM, Kaitai-Shou-Ki or the Bilibili bolt levels) are welcome as pull requests.

---

## What this is

An identification assistant that runs inside DeepSeek Harness, built for exactly two jobs:

- **Kamen Rider belts**: DX or CSM? Is it a KO?
- **Bandai Gunpla kits**: EG / HG / RG / MG / PG / MB / Kaitai-Shou-Ki (解体匠机) — which grade is it? Is it a bootleg?

One design rule holds throughout: **with local recognition, apart from the "write a review" step, nothing calls a large model.** The photo checklist, recognition, the DX/CSM call, knowledge-base lookups, source grading, and fake-news filtering all happen on this machine, at zero tokens. Results go into a local cache, so re-identifying the same batch of photos does not recompute anything.

> This plugin is not an official tool. Identification is reference only — see [Disclaimer](#disclaimer).

---

## What it can do

### Mandatory photo requirements (this is the core, not a hint)

The plugin **blocks** requests that lack evidence instead of returning an inaccurate answer:

| Category | Must be photographed | When there is no box / no way to comply |
|---|---|---|
| **Belt** | Buckle **removed and shot separately**, front and back (the back must show the nameplate); transformation device **removed and shot separately** | Add the whole belt, the battery compartment, the transformation sound |
| **Gunpla** | **Front of the box** (with the Bandai trademark and the grade colour band) | Multiple angles + feature areas + purchase record → if none of that works, **enter the model manually** |
| Other | Brand, part number, close-up of the nameplate | Multiple angles |

The reminder appears in three places, matching the specification: **large text on the startup guide**, **a persistent banner in the capture interface** (not only on failure), and **once more when identification fails**.

### DX / CSM discrimination logic

Scoring runs in the order **material → size → detail → ask about the sound**, and every step has explicit criteria:

- **Material**: die-cast metal parts, leather lining → CSM side
- **Size**: a size larger and thicker than DX → CSM side
- **Detail**: laser engraving, individual serial numbers, metal nameplate → CSM side; injection-moulded trademark plus year → DX side
- **Sound**: dialogue / BGM → basically not DX; only the transformation sound and the finisher sound → DX side

When two scores come out close, the plugin **does not guess**: it returns "suspected", lists the candidates for the user to pick from, and writes the user's choice into the **correction store** (highest priority; later updates never overwrite it).

### Fake news and source grading

Source trust is **derived**, not stamped on:

```
Official site > X/YouTube official account (VPN required) > domestic official account (blue bolt + verified subject + avatar)
> official release list > that year's official promo video > major retailer / mainstream wiki
> posts/blogs from that era > yellow-bolt creator > plain creator > group chat
```

**Bilibili account recognition**: blue bolt = official; yellow bolt = reference only; no bolt = lowest.
A blue bolt **is not enough** — the account must simultaneously have a verified subject, a custom avatar, and a title **and** description that both reflect a toy/model theme. If any one of these is missing, the plugin **opens a dialog for the user to confirm**, and the confirmation goes into the user whitelist so it never asks again.

**Ingress rule**: at least **2 independent sources** must agree, and at least 1 of them must be a fileable source. Otherwise the entry is marked "unconfirmed". **AI-generated content is display-only and is never filed.**

**Search engines**: Chinese Bing first; the Baidu entry point is optional and is always labelled "unverified" when shown; Google for non-Chinese markets, Yandex for Russian; **360 / Sogou / 2345 are never used**.

### Collector mode (optional)

By default the plugin covers only mainstream items. When enabled it also includes:

- **Gunpla**: PG / MGEX / MB / Kaitai-Shou-Ki (解体匠机) / RE100 / FULL MECHANICS / HI-RESOLUTION / limited editions / overseas non-Bandai / GK
- **Belts**: CSM / CS / candy toys / gashapon / limited editions / obscure accessories

### Multilingual

Complete support: **Simplified Chinese / Traditional Chinese / English / Japanese**.
UI translation: Korean, French, Spanish, Portuguese, Russian, Cantonese, Vietnamese, German, Italian, Dutch, Polish.
Every language falls back to English, and a missing key never exposes the raw key.

---

## Installation

### Option 1: send the repository link straight to DSH (recommended)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH installs it into the profile through `plugin_manager`'s `install_bundle`. That is the **only supported** installation path.

### Option 2: clone it, then let DSH install from the local directory

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Then hand the **absolute path of that directory** to `plugin_manager`:

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### Do not install it by hand

The following look like they work, and they make the plugin disappear:

- creating a symlink inside the profile's `node_modules` (a junction on Windows)
- hand-writing a line into the profile's `cordis.patch.yml`
- copying the package under `$DSH_HOME`

Two reasons, both hard to self-diagnose:

1. **Dependency resolution fails.** The loader resolves the package by its REAL path (symlinks are unlinked), so Node looks for `node_modules` upward from your workspace, where the DSH packages are not. Patching in a few is not enough either: `@deepseek-ai/dsh-tools` itself imports `dsh-scope`, `dsh-sandbox`, `dsh-llm` and others that are **absent from its own package.json**, so the whole tree is required.
2. **The loader remembers the failure.** When a row fails to activate, the loader persists `disabled: true` back into the profile, and every later start skips it entirely.

Both present identically: **no interface and no tools**, with no log. See [docs/INSTALL.md](docs/INSTALL.md) for how to tell them apart.

See [docs/INSTALL.md](docs/INSTALL.md) for details.

---

## Configuration

Everything is changed in the profile's `cordis.patch.yml`:

| Field | Default | Description |
|---|---|---|
| `richMode` | `false` | Collector mode |
| `visionEnabled` | `true` | Whether to use a local vision endpoint |
| `visionBaseUrl` | `''` | OpenAI-compatible endpoint; leave empty to auto-probe `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | Model name; leave empty to use the first one the endpoint reports |
| `visionTimeoutMs` | `120000` | Local inference timeout |
| `visionMaxImages` | `6` | Image cap for a single identification |
| `cacheTtlMs` | `86400000` | Identification cache lifetime, 0 disables it |
| `searchLanguage` | `'zh'` | Search market language |
| `allowBaidu` | `false` | Whether to offer the Baidu entry point (always labelled "unverified") |
| `showCompliance` | `false` | Whether to show the GDPR / EU AI Act notes |
| `requireAcknowledgement` | `true` | Whether the disclaimer must be accepted first |

### About "local small-model recognition"

**Where recognition runs.** Three modes, depending on how you configure it:

| Mode | Photos go to | Notes |
|---|---|---|
| **Local endpoint** (empty address, auto-probe) | nowhere — they stay on this machine | Ollama or any OpenAI-compatible server on `127.0.0.1`. Zero cost, works offline. |
| **Remote endpoint** (for example Zhipu with `glm-5.3-flash`) | **that provider's servers** | Fill in the base URL and model, and set the API key. This is your own configuration choice. |
| **No model configured** | nowhere | The checklist, manual model entry and knowledge base still work; only photo recognition is off. |

The plugin never uploads anything by itself. Photos leave this machine **only** when you point the endpoint at a remote address.

Here is the local case, using an OpenAI-compatible vision endpoint that is **already running on your own machine**:

```bash
# Example: Ollama
ollama pull qwen2.5-vl
ollama serve        # listens on 127.0.0.1:11434
```

When no endpoint answers, it neither errors out nor calls anywhere else — it degrades automatically to the **photo checklist + manual model entry** path, still at zero tokens.

---

## The four local tools

Once the plugin is installed, the assistant can use these four tools. They **all execute locally**:

| Tool | Purpose |
|---|---|
| `gear_identify` | Identification + bootleg verdict + edition judgement + confidence; the result is cached and published to the UI |
| `gear_checklist` | Generate/check the photo checklist and work out what is still missing |
| `gear_decide_edition` | DX / CSM scoring and follow-up question chain |
| `gear_knowledge` | Knowledge-base lookup, search plan, source scoring, cross-checking, correction-store writes, local-store writes |

The tool return values already carry the conclusion and the evidence chain, so the assistant **does not** have to guess the model again — that is also the key to saving tokens.

---

## Interface

Three UI surfaces, all registered through the Harness slot system:

1. **Startup guide** (above the conversation input area): large-text photo requirements + disclaimer checkbox + compliance notes + rich-mode toggle. **The capture interface does not appear until consent is checked.**
2. **Capture guide** (persistent): category switch, persistent reminder banner, checkable photo checklist, live hints about what is still missing.
3. **Result panel + settings page**: result cards carry confidence and evidence, and suspected cases let you pick the correction; the settings page manages language, Collector mode, the Baidu entry point, the local endpoint, the disclaimer, and the compliance notes.

---

## QQ bridging (optional)

NapCat / Lagrange, or message forwarding only. **It works without QQ; the core features do not depend on QQ.**

> ⚠️ QQ bridging carries a **ban risk**; the account risk is borne by the user.

---

## Development

```bash
node scripts/smoke.mjs         # 69 checks: photo checklist, decision tree, bootleg verdict, source grading, end to end
node scripts/client-test.mjs   # 43 checks: client contract, four-language rendering, slot registration, i18n fallback
```

Neither test needs a network or a model.

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

Local data directory: `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Deleting it is how you exercise your right to erasure.

---

## Disclaimer

Placed in three places: the startup guide (behind a checkbox), this README, and the settings page:

1. **Identification is reference only**: this plugin is not an official tool and its results can be wrong.
2. **Unofficial**: not affiliated with, authorized by, or endorsed by Bandai, Toei, Tsuburaya, or any vendor.
3. **Data comes from public sources**: entries are compiled from public material and may be outdated or inaccurate; always defer to official information.
4. **QQ bridging carries a ban risk**: if you enable QQ forwarding, the account risk is yours.
5. **AI content is not buying advice**: generated reviews or descriptions are not investment or purchase recommendations.
6. **Open source, provided as is**: no warranty of any kind, express or implied; use at your own risk.
7. **No endorsement of domestic, KO, or overseas third-party products**: detecting a counterfeit is a warning, not a recommendation.

### GDPR / EU AI Act (EU users)

- **GDPR**: recognition data stays on this machine by default (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), and the knowledge base is never uploaded. **If you configure a remote recognition endpoint, photos are sent to that provider** — that is your own configuration; a local endpoint keeps them here. Deleting the local data directory exercises your right to erasure; the plugin builds no user profiles.
- **EU AI Act**: this plugin is an open-source AI system for non-high-risk use, doing assisted identification and information organisation only. All AI-generated content is labelled with its source tier and is display-only, never filed.
- **Transparency**: results come with confidence and an evidence chain, and user corrections outrank automatic results.

---

## Promotion and community

- **GitHub**: public repository, `dsh-plugin` topic, submitted to the DSH Plugin Hub
- **QQ groups**: main group **419573550** · branch group **579938880**
- **Bilibili**: videos have passed review, the description is still to be filled in; multilingual subtitles are carried over to YouTube; videos are watermarked

### Pitfall notes

- Creating a QQ group requires real-name verification
- If GitHub is blocked, keep Gitee / jsDelivr mirrors ready and switch sources on a 404
- For browser hijacking, check 360 / 2345 first; recommended: Kaspersky Free / Huorong / the minimal Tencent PC Manager, and use Geek to uninstall; removing 360 leftovers needs administrator rights
- The EU AI Act basically exempts "open source + local data"
- For Russian, use Yandex / VK / RuTube
- The READMEs are machine-translated plus community proofreading, and **the Chinese version is authoritative**

---

## License

[MIT](LICENSE)

This plugin does not endorse any domestic, KO, or overseas third-party product. Detecting a counterfeit is a warning, not a recommendation.
