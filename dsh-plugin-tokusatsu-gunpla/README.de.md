# Kamen Rider DX-Gürtel & Bandai Gunpla Identifikationsassistent

**DeepSeek Harness Plugin** · Tokusatsu- und Plastikmodell-Doppelnutzen · Erkennung auf dem Desktop, das Telefon macht nur die Fotos

[简体中文](README.md) | [English](README.en.md) | [English (UK)](README.en-GB.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [한국어](README.ko.md) | [Русский](README.ru.md) | [Italiano](README.it.md) | Deutsch

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **Zu den Übersetzungen**: Diese deutsche Fassung ist maschinell übersetzt und von der Community gegengelesen; Formulierungen können ungenau sein. Maßgeblich ist die **[chinesische Fassung in Kurzzeichen](README.md)** — bei Abweichungen gilt sie. Hinweise zu Fachbegriffen (etwa DX, CSM, Kaitai-Shou-Ki oder die Blitz-Stufen auf Bilibili) sind als Pull Request willkommen.

---

## Worum es hier geht

Ein Identifikationsassistent, der in DeepSeek Harness läuft und für genau zwei Aufgaben gebaut ist:

- **Kamen Rider Gürtel**: DX oder CSM? Ist es ein KO?
- **Bandai Gunpla Kits**: EG / HG / RG / MG / PG / MB / Kaitai-Shou-Ki (解体匠机) — welcher Grad ist es? Ist es eine Raubkopie?

Eine Designregel gilt durchgehend: **bei lokaler Erkennung ruft außer beim Schritt „eine Bewertung schreiben“ nichts ein großes Modell auf.** Die Foto-Checkliste, die Erkennung, die DX/CSM-Entscheidung, die Abfragen der Wissensbasis, die Quellenbewertung und die Filterung von Falschnachrichten geschehen alle auf dieser Maschine, bei null Tokens. Die Ergebnisse landen in einem lokalen Cache, sodass die erneute Identifikation desselben Foto-Stapels nichts neu berechnet.

> Dieses Plugin ist kein offizielles Werkzeug. Die Identifikation dient nur als Hinweis — siehe [Haftungsausschluss](#haftungsausschluss).

---

## Was es kann

### Verbindliche Fotoanforderungen (das ist der Kern, kein Hinweis)

Das Plugin **blockiert** Anfragen, denen der Nachweis fehlt, statt eine ungenaue Antwort zu liefern:

| Kategorie | Muss fotografiert werden | Wenn es keine Schachtel vorhanden ist / keine Erfüllung möglich ist |
|---|---|---|
| **Gürtel** | Gürtelschnalle **abgenommen und separat fotografiert**, Vorder- und Rückseite (die Rückseite muss das Typenschild zeigen); Verwandlungsgerät **abgenommen und separat fotografiert** | Den ganzen Gürtel ergänzen, das Batteriefach, den Verwandlungssound |
| **Gunpla** | **Vorderseite der Schachtel** (mit dem Bandai-Markenzeichen und dem Farbband des Grades) | Mehrere Winkel + Funktionsbereiche + Kaufbeleg → wenn nichts davon funktioniert, **das Modell manuell eingeben** |
| Sonstiges | Marke, Teilenummer, Nahaufnahme des Typenschilds | Mehrere Winkel |

Der Hinweis erscheint an drei Stellen, entsprechend der Spezifikation: **großer Text in der Startanleitung**, **ein dauerhaftes Banner in der Aufnahmeoberfläche** (nicht nur bei Fehlschlag) und **noch einmal, wenn die Identifikation fehlschlägt**.

### DX-/CSM-Unterscheidungslogik

Die Bewertung läuft in der Reihenfolge **Material → Größe → Detail → nach dem Sound fragen**, und jeder Schritt hat ausdrückliche Kriterien:

- **Material**: Druckguss-Metallteile, Lederfutter → CSM-Seite
- **Größe**: eine Nummer größer und dicker als DX → CSM-Seite
- **Detail**: Lasergravur, individuelle Seriennummern, Metalltypenschild → CSM-Seite; eingespritztes Markenzeichen plus Jahr → DX-Seite
- **Sound**: Dialoge / BGM → grundsätzlich kein DX; nur der Verwandlungssound und der Finisher-Sound → DX-Seite

Wenn zwei Bewertungen eng beieinanderliegen, **rät das Plugin nicht**: Es liefert „verdächtig“, listet die Kandidaten zur Auswahl durch den Nutzer auf und schreibt die Wahl des Nutzers in den **Korrekturspeicher** (höchste Priorität; spätere Aktualisierungen überschreiben ihn nie).

### Falschnachrichten und Quellenbewertung

Das Vertrauen in eine Quelle wird **abgeleitet**, nicht aufgestempelt:

```
Offizielle Seite > X/YouTube offizieller Account (VPN erforderlich) > inländischer offizieller Account (blauer Blitz + verifiziertes Thema + Avatar)
> offizielle Veröffentlichungsliste > offizielles Werbevideo des jeweiligen Jahres > großer Händler / etabliertes Wiki
> Beiträge/Blogs aus jener Zeit > Creator mit gelbem Blitz > einfacher Creator > Gruppenchat
```

**Bilibili-Account-Erkennung**: blauer Blitz = offiziell; gelber Blitz = nur als Hinweis; kein Blitz = am niedrigsten.
Ein blauer Blitz **reicht nicht** — der Account muss gleichzeitig ein verifiziertes Thema, einen eigenen Avatar und einen Titel **und** eine Beschreibung haben, die beide ein Spielzeug-/Modellthema widerspiegeln. Fehlt eines davon, **öffnet das Plugin einen Dialog zur Bestätigung durch den Nutzer**, und die Bestätigung geht in die Nutzer-Whitelist ein, damit nie wieder gefragt wird.

**Aufnahmeregel**: Mindestens **2 unabhängige Quellen** müssen übereinstimmen, und mindestens 1 davon muss eine archivierbare Quelle sein. Andernfalls wird der Eintrag als „unbestätigt“ markiert. **KI-generierte Inhalte dienen nur der Anzeige und werden nie übernommen.**

**Suchmaschinen**: Zuerst chinesisches Bing; der Baidu-Einstiegspunkt ist optional und wird immer als „unbestätigt“ gekennzeichnet, wenn er gezeigt wird; Google für nicht-chinesische Märkte, Yandex für Russisch; **360 / Sogou / 2345 werden nie verwendet**.

### Sammler-Modus (optional)

Standardmäßig deckt das Plugin nur Mainstream-Artikel ab. Wenn aktiviert, umfasst es zusätzlich:

- **Gunpla**: PG / MGEX / MB / Kaitai-Shou-Ki (解体匠机) / RE100 / FULL MECHANICS / HI-RESOLUTION / limitierte Editionen / ausländische Nicht-Bandai / GK
- **Gürtel**: CSM / CS / Candy Toys / Gashapon / limitierte Editionen / obskures Zubehör

### Mehrsprachig

Vollständige Unterstützung: **vereinfachtes Chinesisch / traditionelles Chinesisch / Englisch / Japanisch**.
UI-Übersetzung: Koreanisch, Französisch, Spanisch, Portugiesisch, Russisch, Kantonesisch, Vietnamesisch, Deutsch, Italienisch, Niederländisch, Polnisch.
Jede Sprache fällt auf Englisch zurück, und ein fehlender Schlüssel legt nie den Rohschlüssel offen.

---

## Installation

### Variante 1: den Repository-Link direkt an DSH schicken (empfohlen)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH installiert es über `install_bundle` von `plugin_manager` in das Profil. Das ist der **einzige unterstützte** Installationsweg.

### Variante 2: klonen und DSH aus dem lokalen Verzeichnis installieren lassen

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Dann den **absoluten Pfad dieses Verzeichnisses** an `plugin_manager` übergeben:

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### Nicht von Hand installieren

Folgendes sieht aus, als würde es funktionieren, und lässt das Plugin verschwinden:

- einen Symlink im `node_modules` des Profils anlegen (unter Windows eine Junction)
- von Hand eine Zeile in die `cordis.patch.yml` des Profils schreiben
- das Paket unter `$DSH_HOME` kopieren

Zwei Gründe, beide schwer selbst zu diagnostizieren:

1. **Die Abhängigkeitsauflösung schlägt fehl.** Der Loader löst das Paket über seinen ECHTEN Pfad auf (Symlinks werden aufgelöst), also sucht Node `node_modules` von Ihrem Arbeitsbereich aus aufwärts, wo die DSH-Pakete nicht liegen. Ein paar hineinzupatchen reicht ebenfalls nicht: `@deepseek-ai/dsh-tools` importiert selbst `dsh-scope`, `dsh-sandbox`, `dsh-llm` und andere, die **in seiner eigenen package.json fehlen**, also ist der ganze Baum erforderlich.
2. **Der Loader merkt sich den Fehlschlag.** Wenn eine Zeile nicht aktiviert werden kann, schreibt der Loader `disabled: true` dauerhaft ins Profil zurück, und jeder spätere Start überspringt sie vollständig.

Beides äußert sich identisch: **keine Oberfläche und keine Tools**, ohne Log. Siehe [docs/INSTALL.md](docs/INSTALL.md), um sie auseinanderzuhalten.

Siehe [docs/INSTALL.md](docs/INSTALL.md) für Details.

---

## Konfiguration

Alles wird in der `cordis.patch.yml` des Profils geändert:

| Feld | Vorgabe | Beschreibung |
|---|---|---|
| `richMode` | `false` | Sammler-Modus |
| `visionEnabled` | `true` | Ob ein lokaler Vision-Endpunkt verwendet wird |
| `visionBaseUrl` | `''` | OpenAI-kompatibler Endpunkt; leer lassen, um `127.0.0.1:11434 / :1234 / :8080` automatisch zu prüfen |
| `visionModel` | `''` | Modellname; leer lassen, um das erste vom Endpunkt gemeldete zu verwenden |
| `visionTimeoutMs` | `120000` | Zeitlimit für lokale Inferenz |
| `visionMaxImages` | `6` | Obergrenze für Bilder bei einer einzelnen Identifikation |
| `cacheTtlMs` | `86400000` | Lebensdauer des Identifikations-Cache, 0 deaktiviert ihn |
| `searchLanguage` | `'zh'` | Sprache des Suchmarktes |
| `allowBaidu` | `false` | Ob der Baidu-Einstiegspunkt angeboten wird (immer als „unbestätigt“ gekennzeichnet) |
| `showCompliance` | `false` | Ob die Hinweise zu GDPR / EU AI Act gezeigt werden |
| `requireAcknowledgement` | `true` | Ob der Haftungsausschluss zuerst akzeptiert werden muss |

### Zur „lokalen Kleinmodell-Erkennung“

**Wo die Erkennung läuft.** Drei Modi, je nachdem, wie Sie es konfigurieren:

| Modus | Fotos gehen an | Hinweise |
|---|---|---|
| **Lokaler Endpunkt** (leere Adresse, automatische Prüfung) | niemanden — sie bleiben auf dieser Maschine | Ollama oder jeder OpenAI-kompatible Server auf `127.0.0.1`. Null Kosten, funktioniert offline. |
| **Entfernter Endpunkt** (zum Beispiel Zhipu mit `glm-5.3-flash`) | **die Server dieses Anbieters** | Basis-URL und Modell eintragen und den API-Schlüssel hinterlegen. Das ist Ihre eigene Konfigurationsentscheidung. |
| **Kein Modell konfiguriert** | niemanden | Checkliste, manuelle Modelleingabe und Wissensbasis funktionieren weiter; nur die Fotoerkennung ist aus. |

Das Plugin lädt von sich aus nichts hoch. Fotos verlassen diese Maschine **nur**, wenn Sie den Endpunkt auf eine entfernte Adresse richten.

```bash
# Beispiel: Ollama
ollama pull qwen2.5-vl
ollama serve        # lauscht auf 127.0.0.1:11434
```

Wenn der Endpunkt nicht verfügbar ist, bricht es weder ab noch ruft es nach außen — es wechselt automatisch auf den Pfad **Foto-Checkliste + manuelle Modelleingabe**, weiterhin bei null Tokens.

---

## Die vier lokalen Tools

Sobald das Plugin installiert ist, kann der Assistent diese vier Tools nutzen. Sie **laufen alle lokal**:

| Tool | Zweck |
|---|---|
| `gear_identify` | Identifikation + Raubkopie-Urteil + Editionsbewertung + Konfidenz; das Ergebnis wird zwischengespeichert und an die UI veröffentlicht |
| `gear_checklist` | Foto-Checkliste erzeugen/prüfen und ermitteln, was noch fehlt |
| `gear_decide_edition` | DX-/CSM-Bewertung und Rückfragekette |
| `gear_knowledge` | Abfrage der Wissensbasis, Suchplan, Quellenbewertung, Gegenprüfung, Schreiben in den Korrekturspeicher, Schreiben in den lokalen Speicher |

Die Rückgabewerte der Tools enthalten bereits das Fazit und die Nachweiskette, sodass der Assistent das Modell **nicht** erneut erraten muss — auch das ist der Schlüssel zum Sparen von Tokens.

---

## Oberfläche

Drei UI-Oberflächen, alle über das Slot-System von Harness registriert:

1. **Startanleitung** (oberhalb des Eingabebereichs der Konversation): Fotoanforderungen in großem Text + Kontrollkästchen für den Haftungsausschluss + Compliance-Hinweise + Umschalter für den reichen Modus. **Die Aufnahmeoberfläche erscheint erst, wenn die Einwilligung angekreuzt ist.**
2. **Aufnahmeanleitung** (dauerhaft): Kategorieumschaltung, dauerhaftes Erinnerungsbanner, ankreuzbare Foto-Checkliste, Live-Hinweise darauf, was noch fehlt.
3. **Ergebnisbereich + Einstellungsseite**: Ergebniskarten tragen Konfidenz und Nachweise, und bei Verdachtsfällen können Sie die Korrektur auswählen; die Einstellungsseite verwaltet Sprache, reichen Modus, den Baidu-Einstiegspunkt, den lokalen Endpunkt, den Haftungsausschluss und die Compliance-Hinweise.

---

## QQ-Anbindung (optional)

NapCat / Lagrange, oder nur Nachrichtenweiterleitung. **Es funktioniert ohne QQ; die Kernfunktionen hängen nicht von QQ ab.**

> ⚠️ Die QQ-Anbindung birgt ein **Sperrrisiko**; das Kontorisiko trägt der Nutzer.

---

## Entwicklung

```bash
node scripts/smoke.mjs         # 69 Prüfungen: Foto-Checkliste, Entscheidungsbaum, Raubkopie-Urteil, Quellenbewertung, Ende zu Ende
node scripts/client-test.mjs   # 43 Prüfungen: Client-Vertrag, Darstellung in vier Sprachen, Slot-Registrierung, i18n-Rückfall
```

Keiner der Tests braucht ein Netzwerk oder ein Modell.

```
lib/
  index.js      Plugin-Einstieg, Konfigurationsschema, Session-Projektion (Ergebnisse an die UI)
  tools.js      die vier für das Modell sichtbaren Tools
  identify.js   Hauptablauf der Identifikation (Nachweis → Raubkopie-Gate → Abgleich → Urteil → Konfidenz)
  checklist.js  Engine für Fotoanforderungen
  decide.js     DX-/CSM-Entscheidungsbaum
  sources.js    Quellenbewertung, Bilibili-Urteile, Gegenprüfung, Routing der Suchmaschinen
  vision.js     Client für den lokalen Vision-Endpunkt + Degradierung
  store.js      dreistufige Wissensbasis (eingebauter Seed / verifiziert / Nutzerkorrekturen)
  i18n.js       Sprachkatalog, Haftungsausschluss, Compliance-Hinweise
  client.js     die Browser-Hälfte (Startanleitung / Aufnahmeanleitung / Ergebnisbereich / Einstellungsseite)
data/
  seed-catalog.json       eingebaute Einträge und Kriterien
  official-whitelist.json offizielle Whitelist verifizierter Themen
```

Lokales Datenverzeichnis: `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Es zu löschen ist die Art, wie Sie Ihr Recht auf Löschung ausüben.

---

## Haftungsausschluss

An drei Stellen platziert: in der Startanleitung (hinter einem Kontrollkästchen), in dieser README und auf der Einstellungsseite:

1. **Die Identifikation dient nur als Hinweis**: Dieses Plugin ist kein offizielles Werkzeug, und seine Ergebnisse können falsch sein.
2. **Inoffiziell**: keine Verbindung zu Bandai, Toei, Tsuburaya oder irgendeinem Hersteller, weder autorisiert noch unterstützt.
3. **Daten stammen aus öffentlichen Quellen**: Die Einträge sind aus öffentlichem Material zusammengestellt und können veraltet oder ungenau sein; maßgeblich sind stets offizielle Angaben.
4. **Die QQ-Anbindung birgt ein Sperrrisiko**: Wenn Sie die QQ-Weiterleitung aktivieren, tragen Sie das Kontorisiko selbst.
5. **KI-Inhalte sind keine Kaufberatung**: Erzeugte Bewertungen oder Beschreibungen sind keine Investitions- oder Kaufempfehlung.
6. **Open Source, bereitgestellt wie besehen**: keinerlei Gewährleistung, weder ausdrücklich noch stillschweigend; Nutzung auf eigenes Risiko.
7. **Keine Empfehlung inländischer, KO- oder ausländischer Drittanbieterprodukte**: Das Erkennen einer Fälschung ist eine Warnung, keine Empfehlung.

### GDPR / EU AI Act (EU-Nutzer)

- **GDPR**: Erkennungsdaten bleiben standardmäßig auf dieser Maschine (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), und die Wissensbasis wird niemals hochgeladen. **Wenn Sie einen entfernten Erkennungsendpunkt konfigurieren, werden Fotos an diesen Anbieter gesendet** — das ist Ihre eigene Konfiguration; ein lokaler Endpunkt behält sie hier. Das Löschen des lokalen Datenverzeichnisses übt Ihr Recht auf Löschung aus; das Plugin erstellt keine Nutzerprofile.
- **EU AI Act**: Dieses Plugin ist ein Open-Source-KI-System für nicht hochriskante Verwendung, das nur unterstützte Identifikation und Informationsorganisation betreibt. Alle KI-generierten Inhalte sind mit ihrer Quellenstufe gekennzeichnet und dienen nur der Anzeige, werden nie übernommen.
- **Transparenz**: Ergebnisse kommen mit Konfidenz und einer Nachweiskette, und Nutzerkorrekturen haben Vorrang vor automatischen Ergebnissen.

---

## Bewerbung und Community

- **GitHub**: öffentliches Repository, Topic `dsh-plugin`, beim DSH Plugin Hub eingereicht
- **QQ-Gruppen**: Hauptgruppe **419573550** · Zweiggruppe **579938880**
- **Bilibili**: Videos haben die Prüfung bestanden, die Beschreibung muss noch gefüllt werden; mehrsprachige Untertitel werden auf YouTube übernommen; Videos tragen ein Wasserzeichen

### Hinweise zu Fallstricken

- Das Anlegen einer QQ-Gruppe erfordert eine Echtnamen-Verifizierung
- Wenn GitHub blockiert ist, halten Sie Gitee-/jsDelivr-Spiegel bereit und wechseln Sie bei einem 404 die Quelle
- Bei Browser-Hijacking zuerst 360 / 2345 prüfen; empfohlen: Kaspersky Free / Huorong / der minimale Tencent PC Manager, und mit Geek deinstallieren; das Entfernen von 360-Resten erfordert Administratorrechte
- Der EU AI Act befreit im Grunde „Open Source + lokale Daten“
- Für Russisch Yandex / VK / RuTube verwenden
- Die READMEs sind maschinell übersetzt plus Korrekturlesen durch die Community, und **die chinesische Fassung ist maßgeblich**

---

## Lizenz

[MIT](LICENSE)

Dieses Plugin empfiehlt kein inländisches, KO- oder ausländisches Drittanbieterprodukt. Das Erkennen einer Fälschung ist eine Warnung, keine Empfehlung.
