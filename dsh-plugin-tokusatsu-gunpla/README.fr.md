# Assistant d'identification Kamen Rider DX Belt et Bandai Gunpla

**Plugin DeepSeek Harness** · Assistant à double usage Tokusatsu + maquette plastique · la reconnaissance sur le bureau, le téléphone ne fait que photographier

[简体中文](README.md) | [English](README.en.md) | [English (UK)](README.en-GB.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Português](README.pt.md) | [한국어](README.ko.md) | [Русский](README.ru.md) | [Italiano](README.it.md) | Français

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **À propos des traductions** : cette version française est traduite automatiquement puis relue par la communauté ; la formulation peut donc être imprécise. La **[version chinoise simplifiée](README.md) fait foi** — en cas de divergence, référez-vous à elle. Les erreurs de terminologie (notamment DX, CSM, Kaitai-Shou-Ki ou les niveaux d'éclair sur Bilibili) sont bienvenues sous forme de pull request.

---

## De quoi s'agit-il

Un assistant d'identification qui tourne à l'intérieur de DeepSeek Harness, conçu pour exactement deux tâches :

- **Ceintures Kamen Rider** : DX ou CSM ? Est-ce un KO ?
- **Maquettes Bandai Gunpla** : EG / HG / RG / MG / PG / MB / Dissection Craft Machine — quel grade est-ce ? Est-ce un bootleg ?

Une règle de conception s'applique du début à la fin : **en reconnaissance locale, mis à part l'étape « écrire une évaluation », rien n'appelle de grand modèle.** La liste de photos, la reconnaissance, l'arbitrage DX/CSM, les consultations de la base de connaissances, la notation des sources et le filtrage des fausses informations se font tous sur cette machine, à zéro token. Les résultats vont dans un cache local, donc ré-identifier le même lot de photos ne recalcule rien.

> Ce plugin n'est pas un outil officiel. L'identification est donnée à titre indicatif — voir [Avertissement](#avertissement).

---

## Ce qu'il sait faire

### Exigences photo obligatoires (c'est le cœur, pas une indication)

Le plugin **bloque** les demandes dépourvues de preuves au lieu de renvoyer une réponse inexacte :

| Catégorie | À photographier obligatoirement | Quand il n'y a pas de boîte / aucun moyen de s'y conformer |
|---|---|---|
| **Ceinture** | Boucle **démontée et photographiée séparément**, recto et verso (le verso doit montrer la plaque signalétique) ; dispositif de transformation **démonté et photographié séparément** | Ajouter la ceinture entière, le compartiment à piles, le son de transformation |
| **Gunpla** | **Face avant de la boîte** (avec la marque Bandai et le bandeau de couleur du grade) | Plusieurs angles + zones caractéristiques + preuve d'achat → si rien de tout cela ne fonctionne, **saisir le modèle manuellement** |
| Autre | Marque, numéro de pièce, gros plan de la plaque signalétique | Plusieurs angles |

Le rappel apparaît à trois endroits, conformément à la spécification : **en gros texte sur le guide de démarrage**, **une bannière persistante dans l'interface de capture** (pas seulement en cas d'échec), et **une fois de plus lorsque l'identification échoue**.

### Logique de discrimination DX / CSM

La notation suit l'ordre **matériau → taille → détail → question sur le son**, et chaque étape a des critères explicites :

- **Matériau** : pièces en métal moulé sous pression, doublure en cuir → côté CSM
- **Taille** : une taille plus grande et plus épaisse que la DX → côté CSM
- **Détail** : gravure au laser, numéros de série individuels, plaque signalétique en métal → côté CSM ; marque moulée par injection plus année → côté DX
- **Son** : dialogues / BGM → en principe pas DX ; uniquement le son de transformation et le son de finisher → côté DX

Quand deux scores sont proches, le plugin **ne devine pas** : il renvoie « suspecté », liste les candidats parmi lesquels l'utilisateur choisit, et inscrit le choix de l'utilisateur dans le **magasin de corrections** (priorité la plus haute ; les mises à jour ultérieures ne l'écrasent jamais).

### Fausses informations et notation des sources

La confiance accordée à une source est **déduite**, pas apposée :

```
Site officiel > compte officiel X/YouTube (VPN requis) > compte officiel national (éclair bleu + sujet vérifié + avatar)
> liste de sorties officielle > vidéo promotionnelle officielle de l'année > grand revendeur / wiki grand public
> publications/blogs de l'époque > créateur à éclair jaune > créateur ordinaire > groupe de discussion
```

**Reconnaissance des comptes Bilibili** : éclair bleu = officiel ; éclair jaune = référence uniquement ; pas d'éclair = le plus bas.
Un éclair bleu **ne suffit pas** — le compte doit simultanément avoir un sujet vérifié, un avatar personnalisé, et un titre **et** une description qui reflètent tous deux un thème jouet/maquette. S'il manque l'un de ces éléments, le plugin **ouvre une boîte de dialogue pour que l'utilisateur confirme**, et la confirmation entre dans la liste blanche de l'utilisateur pour qu'il ne redemande plus jamais.

**Règle d'admission** : au moins **2 sources indépendantes** doivent concorder, et au moins 1 d'entre elles doit être une source archivable. Sinon l'entrée est marquée « non confirmée ». **Le contenu généré par IA est uniquement affiché et n'est jamais archivé.** Le contenu généré par IA est en affichage seul et n'est jamais enregistré.

**Moteurs de recherche** : Bing chinois en premier ; le point d'entrée Baidu est optionnel et toujours étiqueté « non vérifié » lorsqu'il est affiché ; Google pour les marchés non chinois, Yandex pour le russe ; **360 / Sogou / 2345 ne sont jamais utilisés**.

### Mode collectionneur (optionnel)

Par défaut, le plugin ne couvre que les articles grand public. Lorsqu'il est activé, il inclut aussi :

- **Gunpla** : PG / MGEX / MB / Dissection Craft Machine / RE100 / FULL MECHANICS / HI-RESOLUTION / éditions limitées / hors Bandai à l'étranger / GK
- **Ceintures** : CSM / CS / jouets bonbon / gashapon / éditions limitées / accessoires obscurs

### Multilingue

Prise en charge complète : **chinois simplifié / chinois traditionnel / anglais / japonais**.
Traduction de l'interface : coréen, français, espagnol, portugais, russe, cantonais, vietnamien, allemand, italien, néerlandais, polonais.
Chaque langue retombe sur l'anglais, et une clé manquante n'expose jamais la clé brute.

---

## Installation

### Option 1 : envoyer directement le lien du dépôt à DSH (recommandé)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH l'installe dans le profil via `install_bundle` de `plugin_manager`. C'est le **seul** chemin d'installation pris en charge.

### Option 2 : le cloner, puis laisser DSH installer depuis le répertoire local

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Puis remettez le **chemin absolu de ce répertoire** à `plugin_manager` :

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### Ne l'installez pas à la main

Ce qui suit semble fonctionner, et fait disparaître le plugin :

- créer un lien symbolique dans le `node_modules` du profil (une jonction sous Windows)
- écrire à la main une ligne dans le `cordis.patch.yml` du profil
- copier le paquet sous `$DSH_HOME`

Deux raisons, toutes deux difficiles à diagnostiquer soi-même :

1. **La résolution des dépendances échoue.** Le loader résout le paquet par son chemin RÉEL (les liens symboliques sont déliés), donc Node cherche `node_modules` en remontant depuis votre espace de travail, où les paquets DSH ne sont pas. En ajouter quelques-uns par rustine ne suffit pas non plus : `@deepseek-ai/dsh-tools` importe lui-même `dsh-scope`, `dsh-sandbox`, `dsh-llm` et d'autres qui sont **absents de son propre package.json**, donc l'arbre entier est nécessaire.
2. **Le loader se souvient de l'échec.** Quand une ligne n'arrive pas à s'activer, le loader persiste `disabled: true` dans le profil, et chaque démarrage ultérieur l'ignore complètement.

Les deux se présentent de la même façon : **aucune interface et aucun outil**, sans aucun journal. Voir [docs/INSTALL.md](docs/INSTALL.md) pour savoir les distinguer.

Voir [docs/INSTALL.md](docs/INSTALL.md) pour les détails.

---

## Configuration

Tout se modifie dans le `cordis.patch.yml` du profil :

| Champ | Défaut | Description |
|---|---|---|
| `richMode` | `false` | Mode collectionneur |
| `visionEnabled` | `true` | Faut-il utiliser un point d'accès de vision local |
| `visionBaseUrl` | `''` | Point d'accès compatible OpenAI ; laisser vide pour sonder automatiquement `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | Nom du modèle ; laisser vide pour utiliser le premier que le point d'accès annonce |
| `visionTimeoutMs` | `120000` | Délai d'expiration de l'inférence locale |
| `visionMaxImages` | `6` | Nombre maximal d'images pour une seule identification |
| `cacheTtlMs` | `86400000` | Durée de vie du cache d'identification, 0 la désactive |
| `searchLanguage` | `'zh'` | Langue du marché de recherche |
| `allowBaidu` | `false` | Faut-il proposer le point d'entrée Baidu (toujours étiqueté « non vérifié ») |
| `showCompliance` | `false` | Faut-il afficher les notes GDPR / EU AI Act |
| `requireAcknowledgement` | `true` | L'avertissement doit-il être accepté au préalable |

### À propos de la « reconnaissance par petit modèle local »

**Où tourne la reconnaissance.** Trois modes, selon la façon dont vous le configurez :

| Mode | Les photos vont | Remarques |
|---|---|---|
| **Point d'accès local** (adresse vide, sondage automatique) | nulle part — elles restent sur cette machine | Ollama ou tout serveur compatible OpenAI sur `127.0.0.1`. Coût nul, fonctionne hors ligne. |
| **Point d'accès distant** (par exemple Zhipu avec `glm-5.3-flash`) | **les serveurs de ce fournisseur** | Renseignez l'URL de base et le modèle, puis la clé API. C'est votre propre choix de configuration. |
| **Aucun modèle configuré** | nulle part | La liste de photos, la saisie manuelle du modèle et la base de connaissances fonctionnent toujours ; seule la reconnaissance de photos est désactivée. |

Le plugin ne téléverse jamais rien de lui-même. Les photos ne quittent cette machine **que** lorsque vous pointez le point d'accès vers une adresse distante.

Voici le cas local, avec un point d'accès de vision compatible OpenAI qui **tourne déjà sur votre propre machine** :

```bash
# Exemple : Ollama
ollama pull qwen2.5-vl
ollama serve        # écoute sur 127.0.0.1:11434
```

Quand le point d'accès est indisponible, il ne plante pas et n'appelle rien vers l'extérieur — il se dégrade automatiquement vers le chemin **liste de photos + saisie manuelle du modèle**, toujours à zéro token.

---

## Les quatre outils locaux

Une fois le plugin installé, l'assistant peut utiliser ces quatre outils. Ils **s'exécutent tous localement** :

| Outil | Rôle |
|---|---|
| `gear_identify` | Identification + verdict de contrefaçon + jugement d'édition + confiance ; le résultat est mis en cache et publié vers l'interface |
| `gear_checklist` | Générer/vérifier la liste de photos et déterminer ce qui manque encore |
| `gear_decide_edition` | Notation DX / CSM et chaîne de questions de suivi |
| `gear_knowledge` | Consultation de la base de connaissances, plan de recherche, notation des sources, recoupement, écritures dans le magasin de corrections, écritures dans le magasin local |

Les valeurs de retour des outils portent déjà la conclusion et la chaîne de preuves, donc l'assistant **n'a pas** à redéchiffrer le modèle — c'est aussi la clé de l'économie de tokens.

---

## Interface

Trois surfaces d'interface, toutes enregistrées via le système de slots du Harness (`conversation.input.dock`, `conversation.composer.dock`, `settings.section`) :

1. **Guide de démarrage** (au-dessus de la zone de saisie de la conversation) : exigences photo en gros texte + case à cocher de l'avertissement + notes de conformité + bascule du Mode collectionneur. **L'interface de capture n'apparaît pas avant que le consentement ne soit coché.**
2. **Guide de capture** (persistant) : sélecteur de catégorie, bannière de rappel persistante, liste de photos à cocher, indications en direct sur ce qui manque encore.
3. **Panneau de résultats + page de réglages** : les fiches de résultat portent la confiance et les preuves, et les cas suspectés permettent de choisir la correction ; la page de réglages gère la langue, le Mode collectionneur, le point d'entrée Baidu, le point d'accès local, l'avertissement et les notes de conformité.

---

## Passerelle QQ (optionnelle)

NapCat / Lagrange, ou transfert de messages uniquement. **Cela fonctionne sans QQ ; les fonctionnalités principales ne dépendent pas de QQ.**

> ⚠️ La passerelle QQ comporte un **risque de bannissement** ; le risque lié au compte est assumé par l'utilisateur.

---

## Développement

```bash
node scripts/smoke.mjs         # 69 checks: photo checklist, decision tree, bootleg verdict, source grading, end to end
node scripts/client-test.mjs   # 43 checks: client contract, four-language rendering, slot registration, i18n fallback
```

Aucun des deux tests n'a besoin d'un réseau ni d'un modèle.

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

Répertoire de données local : `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Le supprimer est la façon d'exercer votre droit à l'effacement.

---

## Avertissement

Placé à trois endroits : le guide de démarrage (derrière une case à cocher), ce README, et la page de réglages :

1. **Identification indicative** : L'identification est donnée à titre indicatif : ce plugin n'est pas un outil officiel et ses résultats peuvent être erronés.
2. **Non officiel** : Non officiel : aucun lien avec Bandai, Toei, Tsuburaya ou quelque fabricant que ce soit, ni autorisation ni approbation.
3. **Données issues de sources publiques** : Les données proviennent de sources publiques : les fiches sont compilées à partir de documents publics et peuvent être obsolètes ou inexactes ; les informations officielles prévalent toujours.
4. **Risque de bannissement QQ** : La passerelle QQ comporte un risque de bannissement : si vous activez le transfert QQ, le risque incombe au compte de l'utilisateur.
5. **Le contenu IA n'est pas un conseil d'achat** : Le contenu généré par IA ne constitue pas un conseil d'achat : les évaluations ou descriptions générées ne sont ni un conseil en investissement ni une recommandation d'achat.
6. **Open source, en l'état** : Open source, fourni en l'état : aucune garantie, expresse ou implicite ; utilisation à vos propres risques.
7. **Aucune recommandation des contrefaçons** : Aucune recommandation des produits nationaux, KO ou tiers étrangers : détecter une contrefaçon est un avertissement, non une recommandation.

### GDPR / EU AI Act (utilisateurs de l'UE)

- **GDPR** : les données d'identification restent sur cette machine par défaut (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), et la base de connaissances n'est jamais téléversée. **Si vous configurez un point d'accès de reconnaissance distant, les photos sont envoyées à ce fournisseur** — c'est votre propre configuration ; un point d'accès local les garde ici. Supprimer le répertoire de données local exerce votre droit à l'effacement ; le plugin ne construit aucun profil utilisateur.
- **EU AI Act** : ce plugin est un système d'IA open source à usage non à haut risque, qui ne fait que de l'identification assistée et de l'organisation d'informations. Tout contenu généré par IA est étiqueté avec son niveau de source et est uniquement affiché, jamais archivé.
- **Transparence** : les résultats viennent avec une confiance et une chaîne de preuves, et les corrections de l'utilisateur priment sur les résultats automatiques.

---

## Promotion et communauté

- **GitHub** : dépôt public, sujet `dsh-plugin`, soumis au DSH Plugin Hub
- **Groupes QQ** : groupe principal **419573550** · groupe annexe **579938880**
- **Bilibili** : les vidéos ont passé la revue, la description reste à remplir ; les sous-titres multilingues sont repris sur YouTube ; les vidéos sont filigranées

### Notes de pièges

- Créer un groupe QQ exige une vérification d'identité réelle
- Si GitHub est bloqué, gardez des miroirs Gitee / jsDelivr prêts et changez de source sur un 404
- En cas de détournement de navigateur, vérifiez d'abord 360 / 2345 ; recommandé : Kaspersky Free / Huorong / le gestionnaire PC Tencent minimal, et utilisez Geek pour désinstaller ; retirer les restes de 360 nécessite des droits d'administrateur
- L'EU AI Act exempte pratiquement « open source + données locales »
- Pour le russe, utilisez Yandex / VK / RuTube
- Les README sont traduits automatiquement puis relus par la communauté, et **la version chinoise fait foi**

---

## Licence

[MIT](LICENSE)

Ce plugin ne recommande aucun produit national, KO ou tiers étranger. Détecter une contrefaçon est un avertissement, non une recommandation.
