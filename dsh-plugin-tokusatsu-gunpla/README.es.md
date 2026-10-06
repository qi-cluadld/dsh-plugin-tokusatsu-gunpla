# Asistente de identificación de cinturones DX de Kamen Rider y Gunpla de Bandai

**Plugin de DeepSeek Harness** · Asistente de doble uso: tokusatsu y modelismo plástico · reconocimiento en el escritorio, el móvil solo hace fotos

[简体中文](README.md) | [English](README.en.md) | [English (UK)](README.en-GB.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Português](README.pt.md) | [한국어](README.ko.md) | [Русский](README.ru.md) | [Italiano](README.it.md)

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **Sobre las traducciones**: esta versión en español está traducida automáticamente y revisada por la comunidad, así que la redacción puede ser imprecisa. La **[versión en chino simplificado](README.md) es la autoritativa**: si hay discrepancias, prevalece esa. Los errores de terminología (por ejemplo DX, CSM, Kaitai-Shou-Ki o los niveles de rayo de Bilibili) se agradecen como pull request.

---

## Qué es esto

Un asistente de identificación que se ejecuta dentro de DeepSeek Harness y está hecho para exactamente dos tareas:

- **Cinturones de Kamen Rider**: ¿DX o CSM? ¿Es un KO?
- **Kits de Gunpla de Bandai**: EG / HG / RG / MG / PG / MB / Kaitai-Shou-Ki (解体匠机) — ¿de qué grado es? ¿Es una copia pirata?

Una regla de diseño se mantiene en todo momento: **con reconocimiento local, salvo en el paso de «escribir una reseña», nada llama a un modelo grande.** La lista de fotos obligatorias, el reconocimiento, el veredicto DX/CSM, las consultas a la base de conocimiento, la clasificación de fuentes y el filtrado de noticias falsas ocurren en esta máquina, con cero tokens. Los resultados van a una caché local, así que volver a identificar el mismo lote de fotos no recalcula nada.

> Este plugin no es una herramienta oficial. La identificación es solo orientativa; consulta el [Descargo de responsabilidad](#descargo-de-responsabilidad).

---

## Qué puede hacer

### Requisitos de fotos obligatorios (esto es el núcleo, no una sugerencia)

El plugin **bloquea** las solicitudes que carecen de pruebas en lugar de devolver una respuesta inexacta:

| Categoría | Hay que fotografiar | Cuando no hay caja o no se puede cumplir |
|---|---|---|
| **Cinturón** | Hebilla **desmontada y fotografiada aparte**, por delante y por detrás (el reverso debe mostrar la placa de identificación); dispositivo de transformación **desmontado y fotografiado aparte** | Añade el cinturón completo, el compartimento de las pilas, el sonido de transformación |
| **Gunpla** | **Parte frontal de la caja** (con la marca Bandai y la banda de color del grado) | Varios ángulos + zonas características + comprobante de compra → si nada de eso funciona, **introduce el modelo a mano** |
| Otros | Marca, número de referencia, primer plano de la placa de identificación | Varios ángulos |

El recordatorio aparece en tres sitios, conforme a la especificación: **texto grande en la guía de inicio**, **un aviso persistente en la interfaz de captura** (no solo al fallar) y **una vez más cuando la identificación falla**.

### Lógica de discriminación DX / CSM

La puntuación sigue el orden **material → tamaño → detalle → preguntar por el sonido**, y cada paso tiene criterios explícitos:

- **Material**: piezas de metal fundido a presión, forro de cuero → lado CSM
- **Tamaño**: una talla más grande y más grueso que el DX → lado CSM
- **Detalle**: grabado láser, números de serie individuales, placa de identificación metálica → lado CSM; marca de inyección más año → lado DX
- **Sonido**: diálogos / BGM → básicamente no es DX; solo el sonido de transformación y el sonido de remate → lado DX

Cuando dos puntuaciones quedan cerca, el plugin **no adivina**: devuelve «sospechoso», enumera los candidatos para que el usuario elija y escribe la elección del usuario en el **almacén de correcciones** (prioridad máxima; las actualizaciones posteriores nunca lo sobrescriben).

### Noticias falsas y clasificación de fuentes

La confianza en la fuente se **deriva**, no se etiqueta a mano:

```
Sitio oficial > cuenta oficial en X/YouTube (requiere VPN) > cuenta oficial nacional (rayo azul + sujeto verificado + avatar)
> lista oficial de lanzamientos > vídeo promocional oficial de ese año > gran minorista / wiki de referencia
> publicaciones/blogs de la época > creador con rayo amarillo > creador sin más > chat de grupo
```

**Reconocimiento de cuentas de Bilibili**: rayo azul = oficial; rayo amarillo = solo como referencia; sin rayo = el mínimo.
Un rayo azul **no basta**: la cuenta debe tener a la vez un sujeto verificado, un avatar personalizado y un título **y** una descripción que reflejen ambos un tema de juguetes/maquetas. Si falta cualquiera de estos elementos, el plugin **abre un diálogo para que el usuario confirme**, y la confirmación pasa a la lista blanca del usuario para no volver a preguntar.

**Regla de entrada**: al menos **2 fuentes independientes** deben coincidir, y al menos 1 de ellas debe ser una fuente archivable. De lo contrario, la ficha se marca como «sin confirmar». **El contenido generado por IA es solo para mostrar y nunca se archiva.**

**Motores de búsqueda**: primero Bing en chino; el acceso a Baidu es opcional y siempre se etiqueta como «sin verificar» cuando se muestra; Google para mercados no chinos, Yandex para ruso; **360 / Sogou / 2345 no se usan nunca**.

### Modo coleccionista (opcional)

Por defecto el plugin cubre solo artículos mayoritarios. Cuando se activa, también incluye:

- **Gunpla**: PG / MGEX / MB / Kaitai-Shou-Ki (解体匠机) / RE100 / FULL MECHANICS / HI-RESOLUTION / ediciones limitadas / no Bandai de ultramar / GK
- **Cinturones**: CSM / CS / juguetes de golosina / gashapon / ediciones limitadas / accesorios poco conocidos

### Multilingüe

Compatibilidad completa: **chino simplificado / chino tradicional / inglés / japonés**.
Traducción de la interfaz: coreano, francés, español, portugués, ruso, cantonés, vietnamita, alemán, italiano, neerlandés, polaco.
Todos los idiomas recurren al inglés como respaldo, y una clave que falta nunca expone la clave en bruto.

---

## Instalación

### Opción 1: enviar el enlace del repositorio directamente a DSH (recomendado)

```
Install this plugin for me: https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH lo instala en el perfil mediante `install_bundle` de `plugin_manager`. Esa es la **única** vía de instalación admitida.

### Opción 2: clonarlo y dejar que DSH instale desde el directorio local

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

Luego entrega la **ruta absoluta de ese directorio** a `plugin_manager`:

```
Use plugin_manager, action install_bundle, and set target to this directory's absolute path
```

### No lo instales a mano

Lo siguiente parece funcionar, y hace desaparecer el plugin:

- crear un enlace simbólico dentro de `node_modules` del perfil (un junction en Windows)
- escribir a mano una línea en el `cordis.patch.yml` del perfil
- copiar el paquete bajo `$DSH_HOME`

Dos razones, ambas difíciles de autodiagnosticar:

1. **Falla la resolución de dependencias.** El cargador resuelve el paquete por su ruta REAL (los enlaces simbólicos se desenlazan), así que Node busca `node_modules` hacia arriba desde tu espacio de trabajo, donde no están los paquetes de DSH. Parchear unos cuantos tampoco basta: `@deepseek-ai/dsh-tools` importa por sí mismo `dsh-scope`, `dsh-sandbox`, `dsh-llm` y otros que están **ausentes de su propio package.json**, así que se requiere todo el árbol.
2. **El cargador recuerda el fallo.** Cuando una fila no consigue activarse, el cargador persiste `disabled: true` de vuelta en el perfil, y cada arranque posterior la omite por completo.

Ambos se presentan igual: **ninguna interfaz y ninguna herramienta**, sin registro alguno. Consulta [docs/INSTALL.md](docs/INSTALL.md) para distinguirlos.

Consulta [docs/INSTALL.md](docs/INSTALL.md) para más detalles.

---

## Configuración

Todo se cambia en el `cordis.patch.yml` del perfil:

| Campo | Valor por defecto | Descripción |
|---|---|---|
| `richMode` | `false` | Modo coleccionista |
| `visionEnabled` | `true` | Si se usa un endpoint de visión local |
| `visionBaseUrl` | `''` | Endpoint compatible con OpenAI; déjalo vacío para sondear automáticamente `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | Nombre del modelo; déjalo vacío para usar el primero que informe el endpoint |
| `visionTimeoutMs` | `120000` | Tiempo de espera de la inferencia local |
| `visionMaxImages` | `6` | Límite de imágenes para una sola identificación |
| `cacheTtlMs` | `86400000` | Vida de la caché de identificación, 0 la desactiva |
| `searchLanguage` | `'zh'` | Idioma del mercado de búsqueda |
| `allowBaidu` | `false` | Si se ofrece el acceso a Baidu (siempre etiquetado «sin verificar») |
| `showCompliance` | `false` | Si se muestran las notas del RGPD / EU AI Act |
| `requireAcknowledgement` | `true` | Si hay que aceptar antes el descargo de responsabilidad |

### Sobre el «reconocimiento con modelo pequeño local»

**Dónde se hace el reconocimiento.** Tres modos, según cómo lo configures:

| Modo | Las fotos van a | Notas |
|---|---|---|
| **Endpoint local** (dirección vacía, sondeo automático) | ningún sitio: se quedan en esta máquina | Ollama o cualquier servidor compatible con OpenAI en `127.0.0.1`. Coste cero, funciona sin conexión. |
| **Endpoint remoto** (por ejemplo, Zhipu con `glm-5.3-flash`) | **los servidores de ese proveedor** | Rellena la URL base y el modelo, y configura la clave de API. Es una decisión de configuración tuya. |
| **Sin modelo configurado** | ningún sitio | La lista de fotos obligatorias, la introducción manual del modelo y la base de conocimiento siguen funcionando; solo se desactiva el reconocimiento de fotos. |

El plugin no sube nada por su cuenta. Las fotos salen de esta máquina **solo** cuando apuntas el endpoint a una dirección remota.

Este es el caso local, con un endpoint de visión compatible con OpenAI que **ya se está ejecutando en tu propia máquina**:

```bash
# Ejemplo: Ollama
ollama pull qwen2.5-vl
ollama serve        # escucha en 127.0.0.1:11434
```

Cuando el endpoint no está disponible, ni da error ni llama al exterior: degrada automáticamente a la ruta de **lista de fotos obligatorias + introducción manual del modelo**, también con cero tokens.

---

## Las cuatro herramientas locales

Una vez instalado el plugin, el asistente puede usar estas cuatro herramientas. **Todas se ejecutan en local**:

| Herramienta | Propósito |
|---|---|
| `gear_identify` | Identificación + veredicto de piratería + juicio de edición + confianza; el resultado se cachea y se publica en la interfaz |
| `gear_checklist` | Generar/comprobar la lista de fotos obligatorias y averiguar qué falta todavía |
| `gear_decide_edition` | Puntuación DX / CSM y cadena de preguntas de seguimiento |
| `gear_knowledge` | Consulta a la base de conocimiento, plan de búsqueda, puntuación de fuentes, verificación cruzada, escrituras en el almacén de correcciones y en el almacén local |

Los valores de retorno de las herramientas ya llevan la conclusión y la cadena de pruebas, así que el asistente **no** tiene que volver a adivinar el modelo; esa es también la clave para ahorrar tokens.

---

## Interfaz

Tres superficies de interfaz, todas registradas a través del sistema de slots de Harness (`conversation.input.dock`, `conversation.composer.dock`, `settings.section`):

1. **Guía de inicio** (encima del área de entrada de la conversación): requisitos de fotos en texto grande + casilla del descargo de responsabilidad + notas de cumplimiento + conmutador de Modo coleccionista. **La interfaz de captura no aparece hasta que se marca el consentimiento.**
2. **Guía de captura** (persistente): cambio de categoría, aviso recordatorio persistente, lista de fotos marcable, indicaciones en vivo sobre lo que aún falta.
3. **Panel de resultados + página de ajustes**: las tarjetas de resultado llevan confianza y pruebas, y los casos sospechosos te dejan elegir la corrección; la página de ajustes gestiona el idioma, el Modo coleccionista, el acceso a Baidu, el endpoint local, el descargo de responsabilidad y las notas de cumplimiento.

---

## Puente con QQ (opcional)

NapCat / Lagrange, o solo reenvío de mensajes. **Funciona sin QQ; las funciones principales no dependen de QQ.**

> ⚠️ El puente con QQ conlleva **riesgo de bloqueo**; el riesgo de la cuenta lo asume el usuario.

---

## Desarrollo

```bash
node scripts/smoke.mjs         # 69 checks: photo checklist, decision tree, bootleg verdict, source grading, end to end
node scripts/client-test.mjs   # 43 checks: client contract, four-language rendering, slot registration, i18n fallback
```

Ninguna de las dos pruebas necesita red ni modelo.

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

Directorio de datos local: `$DSH_HOME/plugin-data/tokusatsu-gunpla/`. Borrarlo es la forma de ejercer tu derecho de supresión.

---

## Descargo de responsabilidad

Aparece en tres sitios: la guía de inicio (tras una casilla), este README y la página de ajustes:

1. **La identificación es solo orientativa**: este plugin no es una herramienta oficial y sus resultados pueden ser erróneos.
2. **No oficial**: sin relación con Bandai, Toei, Tsuburaya ni ningún fabricante, y sin autorización ni respaldo alguno.
3. **Los datos proceden de fuentes públicas**: las fichas se recopilan de material público y pueden estar desactualizadas o ser inexactas; prevalece siempre la información oficial.
4. **La pasarela de QQ conlleva riesgo de bloqueo**: si activas el reenvío de QQ, el riesgo de la cuenta es tuyo.
5. **El contenido de IA no es asesoramiento de compra**: las reseñas o descripciones generadas no son recomendaciones de inversión ni de compra.
6. **Código abierto, tal cual**: sin garantía de ningún tipo, expresa o implícita; uso bajo tu propio riesgo.
7. **Sin respaldo a productos nacionales, KO o de terceros extranjeros**: detectar una falsificación es una advertencia, no una recomendación.

### GDPR / EU AI Act (usuarios de la UE)

- **GDPR**: los datos de identificación se quedan en esta máquina por defecto (`$DSH_HOME/plugin-data/tokusatsu-gunpla`), y la base de conocimiento nunca se sube. **Si configuras un endpoint de reconocimiento remoto, las fotos se envían a ese proveedor** — es tu propia configuración; un endpoint local las mantiene aquí. Borrar el directorio de datos local ejerce tu derecho de supresión; el plugin no crea perfiles de usuario.
- **EU AI Act**: este plugin es un sistema de IA de código abierto para uso no de alto riesgo, que solo hace identificación asistida y organización de información. Todo el contenido generado por IA se etiqueta con su nivel de fuente y es solo para mostrar, nunca se archiva.
- **Transparencia**: los resultados vienen con confianza y una cadena de pruebas, y las correcciones del usuario tienen prioridad sobre los resultados automáticos.

---

## Promoción y comunidad

- **GitHub**: repositorio público, tema `dsh-plugin`, enviado al DSH Plugin Hub
- **Grupos de QQ**: grupo principal **419573550** · grupo secundario **579938880**
- **Bilibili**: los vídeos han pasado la revisión, la descripción está aún por completar; los subtítulos multilingües se trasladan a YouTube; los vídeos llevan marca de agua

### Notas de escollos

- Crear un grupo de QQ requiere verificación con nombre real
- Si GitHub está bloqueado, ten preparados los espejos de Gitee / jsDelivr y cambia de fuente ante un 404
- Ante el secuestro del navegador, revisa primero 360 / 2345; recomendado: Kaspersky Free / Huorong / el Tencent PC Manager mínimo, y usa Geek para desinstalar; quitar los restos de 360 necesita permisos de administrador
- El EU AI Act básicamente exime «código abierto + datos locales»
- Para ruso, usa Yandex / VK / RuTube
- Los README están traducidos por máquina y revisados por la comunidad, y **la versión en chino es la autoritativa**

---

## Licencia

[MIT](LICENSE)

Este plugin no respalda ningún producto nacional, KO o de terceros extranjeros. Detectar una falsificación es una advertencia, no una recomendación.
