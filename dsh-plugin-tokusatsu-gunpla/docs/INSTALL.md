# 安装指南 · Installation

本插件是一个标准的 DSH **双面插件包**：`lib/index.js` 是 Host 半边（工具、配置、结果投影），`lib/client.js` 是浏览器半边（界面）。两侧由 `package.json` 的 `dsh.client` 声明联系起来。

This plugin is a standard DSH dual-face package: `lib/index.js` is the Host half (tools, config, result projection) and `lib/client.js` is the browser half (UI). `package.json` → `dsh.client` links the two.

---

## 前置条件

- DeepSeek Harness 桌面版（本插件按 `0.1.5-rc.3` 的插件契约开发，`dsh.client.platform` 为 `web`）
- **可选**：一个 OpenAI 兼容视觉端点，二选一：
  - **本机端点**（推荐，隐私最好）：Ollama / LM Studio / llama.cpp server / LocalAI
  - **远端端点**：例如智谱 `https://open.bigmodel.cn/api/paas/v4`，模型 `glm-5.3-flash`

**不需要**视觉端点也能用：拍照清单、判断树、知识库查询、来源分级全部本地执行，只少了"看图识别"。

> ⚠️ **配远端端点会把照片发出去。** 本机端点不出本机；填了远端地址（智谱等）照片就会发送给该服务商，并按它的计费产生费用。**这是你自己的配置选择**——不填就永远不上传。详见下面「识别跑在哪里」。

---

## 方式一：让 DSH 自己装（最省事）

把仓库链接直接发给 DSH：

```
帮我安装这个插件：https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH 会自己 clone、装依赖、写 profile 配置。

---

## 方式二：用 plugin_manager 装（桌面版唯一正确的做法）

**这是本插件实际安装成功的方式，也是 DSH 官方文档指定的方式。** 不要手工改 profile 的 `package.json`、不要手工改 `cordis.patch.yml`、不要手工建软链 —— 下面这一步会把它们全做完。

要求：本插件是一个 **bundle**（`package.json` 里声明了 `dsh.bundle.patch` 并随包提供 `cordis.patch.yml`）。

在任意会话里对助手说：

```
用 plugin_manager，action 用 install_bundle，target 填这个目录的绝对路径：
D:\deepseek harness\dsh-plugin-tokusatsu-gunpla
```

或从 GitHub 装：`target` 填 `@dsh-plugin/tokusatsu-gunpla`。

`install_bundle` 会依次完成：

1. 用 pnpm 把包安装进当前 profile（`link:` 本地目录或从 registry 拉取）
2. 把这个 bundle 加进 profile `package.json` 的 `dsh.profile.bundles`
3. 应用 bundle 自带的 patch（即插件行）
4. 报告结果：`application: "applied"` 才算成功

成功后**不需要重启**：DSH 通过 HMR 就地激活新 bundle，四个工具立刻可用。

### 成功的样子

`plugin_manager` / `action: list_bundles` 里会看到：

```json
{
  "name": "@dsh-plugin/tokusatsu-gunpla",
  "version": "0.1.0",
  "enabled": true,
  "installed": true,
  "removable": true,
  "rows": [{ "rowId": "tokusatsu-gunpla", "moduleName": "@dsh-plugin/tokusatsu-gunpla", "entryId": "include:tokusatsu-gunpla" }]
}
```

profile 的 `package.json` 会被自动改写（**这是正确的，不要手改**）：

```json
{
  "dependencies": { "@dsh-plugin/tokusatsu-gunpla": "link:D:/deepseek harness/dsh-plugin-tokusatsu-gunpla" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@dsh-plugin/tokusatsu-gunpla"] } }
}
```

### 失败的样子

| `error.code` | 含义 | 处理 |
|---|---|---|
| `incompatible-version` | peerDependencies 与本机 dsh 运行时版本不符 | 见下面「版本兼容」 |
| `not-bundle` | 包里没有 `dsh.bundle.patch` 或 `cordis.patch.yml` | 更新插件到带 bundle 声明的版本 |
| `pendingBuilds` 非空 | 包有 install 脚本待批准 | 用户明确同意后再用 `approvedBuilds` 重试 |

### 版本兼容（重要）

`install_bundle` 会拿插件的 `peerDependencies` 和**本机 dsh 运行时**比对，不匹配就直接拒绝安装：

```
dsh: installation rejected: Plugin @dsh-plugin/tokusatsu-gunpla@0.1.0 is incompatible with dsh 0.2.0-rc.2:
peerDependencies {"@deepseek-ai/dsh-tools":"^0.1.5-rc.3"}.
```

要看**本机真正的运行时版本**，别查 `profiles/node_modules` —— 那里可能躺着另一个更旧的版本（开发时那里是 `0.1.5-rc.3`，而实际运行的是 `0.2.0-rc.2`，导致安装被拒）。真正的版本在应用自带的 vendored 目录里：

- 运行时包：`<应用安装目录>\resources\app.asar` → 内部路径 `dsh/node_modules/@deepseek-ai/dsh/package.json`
- `app.asar` 是打包档，用 7-Zip 或 `npx asar extract` 打开即可

本插件的 `peerDependencies` 已按 **dsh 0.2.0-rc.2 / schemastery 3.18.4 / cordis 4.0.4** 对齐（即 0.2.x 系列；`^0.2.0-rc.2` 也接受同系列更高版本）。

如果确实要用一个 peer 范围不符的版本，可以用 `dsh plugin allow-version` 或 plugin_manager 的 `set_version_exemption` 授予**精确版本豁免** —— 但这是显式承担崩溃与数据损坏风险，只在明确知情时使用。

---

## 方式三：本地开发调试（不安装）

只想跑测试、改代码时用，不注册进 profile：

```bash
node scripts/test.mjs            # 196 项，无需网络与模型
node scripts/verify-profile.mjs  # 离线重放 profile composition
```

如果要让桌面版加载工作区里的源码（开发态热改），仍然推荐用**方式二**装成本地 `link:` —— 它会让 pnpm 建立软链，改源码即时生效，而且依赖由 pnpm 正确解析。

> ⚠️ **不要手工做下面这些事**：手写 profile 的 `cordis.patch.yml`、手工建 `node_modules` 软链、把包放到 `$DSH_HOME` 下、在 profile 目录里跑 pnpm。开发本插件时我全踩了一遍：手工插入的行会被加载器按运行时状态**持久化改写**，而且依赖解析会因为 Node 把 junction 解析成真实路径而失败（`profiles/node_modules` 找不到）。`install_bundle` 就是为了避免这些。

**Windows（用 junction，不需要管理员权限）**

```powershell
$link = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@dsh-plugin\tokusatsu-gunpla"
New-Item -ItemType Directory -Force -Path (Split-Path $link) | Out-Null
New-Item -ItemType Junction -Path $link -Target "D:\path\to\dsh-plugin-tokusatsu-gunpla"
```

**macOS / Linux**

```bash
mkdir -p ~/.dsh/profiles/desktop/node_modules/@dsh-plugin
ln -s /path/to/dsh-plugin-tokusatsu-gunpla \
      ~/.dsh/profiles/desktop/node_modules/@dsh-plugin/tokusatsu-gunpla
```

### 2. 确认依赖能解析

插件的运行时依赖是 `@deepseek-ai/dsh-tools`、`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-session-projection`（以及 `zod`），这些都已经在 `$DSH_HOME/profiles/node_modules` 里。Node 从插件目录向上查找时会经过 `profiles/node_modules`，所以通常不需要额外安装。

自检：

```bash
node --input-type=module -e "
  await import('@deepseek-ai/dsh-tools');
  await import('@deepseek-ai/schemastery');
  console.log('deps resolve');
" --experimental-default-type=module
```

如果报 `ERR_MODULE_NOT_FOUND`，在插件的 `package.json` 里把缺的包加成 `dependencies`，然后重建软链。

### 3. 加 loader 行

编辑 `$DSH_HOME/profiles/desktop/cordis.patch.yml`，在**已有的 patch 数组**末尾追加：

```yaml
- name: '@dsh-plugin/tokusatsu-gunpla'
  config:
    richMode: false
    visionEnabled: true
    visionBaseUrl: ''
    visionModel: ''
    allowBaidu: false
    showCompliance: false
```

### 4. 让桌面版重新读配置

`desktop` profile 是**实时 profile**（`patchReload: live`），保存 `cordis.patch.yml` 后配置层会重新应用。若界面没变化，重启 DeepSeek Harness。

### 5. 验证

- 对话输入区上方出现**启动引导页**，含大字拍照要求与 7 条免责声明 → Host + Client 都加载成功
- 设置页出现「腰带 / 高达识别」一项 → slot 注册成功
- 对助手说「识别这张图」并附上照片 → 助手调用 `gear_identify`

Host 侧失败会在日志里出现 `tokusatsu-gunpla:` 前缀且**没有**界面；Client 侧失败则 Host 工具可用但界面缺失。两处都失败时检查软链和 `cordis.patch.yml` 的缩进。

---

## 卸载

1. 删掉 `cordis.patch.yml` 里那一行
2. 删掉软链：
   ```powershell
   Remove-Item "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@dsh-plugin\tokusatsu-gunpla"
   ```
3. 可选：删掉本地数据（**这会永久删除你的纠正记录**）
   ```powershell
   Remove-Item -Recurse "$env:USERPROFILE\.dsh\plugin-data\tokusatsu-gunpla"
   ```

---

## 本地数据

| 路径 | 内容 |
|---|---|
| `$DSH_HOME/plugin-data/tokusatsu-gunpla/records.json` | update 机制核实后入库的条目 |
| `$DSH_HOME/plugin-data/tokusatsu-gunpla/corrections.json` | **用户纠正，最高优先级，更新永不覆盖** |
| `$DSH_HOME/plugin-data/tokusatsu-gunpla/whitelist-user.json` | 用户确认过的官方账号白名单 |
| `$DSH_HOME/plugin-data/tokusatsu-gunpla/cache/identify.json` | 识别结果缓存 |

删除整个目录 = 行使 GDPR 删除权。插件不建立用户画像。**知识库内容从不上传**；照片是否上传取决于你配的端点（见下）。

### 识别跑在哪里

| 模式 | 照片去向 | 说明 |
|---|---|---|
| **本机端点**（`visionBaseUrl` 留空自动探测） | 哪也不去 | Ollama 等跑在 `127.0.0.1` 的服务。零成本、可断网 |
| **远端端点**（例如智谱） | **该服务商的服务器** | 填 base URL + 模型 + API key。**你自己配的，费用按对方计费** |
| **没配模型** | 哪也不去 | 拍照清单、手动补型号、知识库照常工作，只是不能看图 |

**插件自己不会主动上传任何东西**——照片离开本机，只发生在你把端点指向远端地址的时候。

> ⚠️ **远端端点必须写明模型名**（`visionModel`）。本机端点可以留空（自动用它已下载的第一个模型），但远端端点的 `/models` 是**服务商整个模型目录**——替你随便挑一个，等于把你的照片发给一个你没选的模型，还可能按更贵的价格计费。留空时插件**不发图**，并在结果面板顶部标出「配置问题」。

#### 接智谱（远端示例）

在 profile 的 `cordis.patch.yml` **末尾**追加：

```yaml
- id: tokusatsu-gunpla
  config:
    visionEnabled: true
    visionBaseUrl: 'https://open.bigmodel.cn/api/paas/v4'
    visionModel: 'glm-5.3-flash'
    visionApiKey: '<你的智谱 API Key>'
```

- `id` 必须是 `tokusatsu-gunpla`（和 bundle 里那一行一致 → 属于**改配置**，不是新增一行）
- **缩进用空格，不要 Tab**
- 兼容格式：OpenAI Chat Completions，图片走 `type: image_url` + Base64 Data URL
- 国内直连，不需要 VPN
- API Key 在 https://bigmodel.cn/usercenter/proj-mgmt/apikeys 生成
- 换成别的 OpenAI 兼容服务（含本机）只需改这三项
- 改完**完全退出应用再打开**（profile 是启动时读的，不是热加载）

#### 用设置页生成配置片段

设置页「腰带 / 高达识别」里有**端点地址 / 模型名 / 密钥**三个输入框，填好后点「生成配置指令」，会把一段**带占位符的 YAML 片段复制到剪贴板**：

```yaml
- id: tokusatsu-gunpla
  config:
    visionEnabled: true
    visionBaseUrl: "你填的地址"
    visionModel: "你填的模型"
    visionApiKey: 'PASTE-YOUR-API-KEY-HERE'
```

粘到 `cordis.patch.yml` 末尾后，**在文件里本地填上真密钥**。

> **为什么密钥不进对话**：客户端唯一能持久化配置的通道是"把内容作为一条消息发给助手"，那样密钥会**明文出现在对话记录里**。所以这个按钮只复制片段、且**片段里是占位符**——密钥只存在于你自己的配置文件里。
> 输入框里填的密钥仅存在浏览器本地（localStorage），用于你确认"配的是哪个端点"。

> 模型名以[智谱模型页](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash)为准；旧型号 `glm-4v` 已不是主推，但仍可用。

---

## 排查

| 现象 | 原因 / 处理 |
|---|---|
| 界面和四个工具都没有 | 插件被加载器自动停用了。见下面「插件被自动停用」 |
| 界面完全不出现（工具正常） | 检查 `cordis.patch.yml` 缩进与 `name` 拼写；确认是顶层数组（`- insert:` 顶格）。Client 半边可能未进图：确认 `package.json` 有 `exports["./client"]` 与 `dsh.client.platform: "web"` |
| 「本地视觉模型不可用」 | 正常降级，不是错误。启动 Ollama 并 `ollama pull qwen2.5-vl`，或在配置里填 `visionBaseUrl`（本机或远端都行） |
| 识别总说证据不足 | 这是设计行为。按拍照清单补拍：腰带必须拆带扣、拆变身道具；高达必须有盒子正面 |
| 腰带面板拆不下来，清单永远卡在「带扣单独拆下拍摄」 | 0.1.0 之后不该再出现。在拍照界面关掉「带扣可拆下」开关（或调 `gear_checklist` 时传 `buckleSeparable: false`），必拍项会换成「面板背面铭牌翻拍」：整条腰带翻过来拍背面铭牌即可。若仍卡住，说明 Client 半边是旧版本 |
| 结果标「疑似」 | 得分接近或缺少标识证据。点选候选即可，选择会进纠正库 |
| `ERR_MODULE_NOT_FOUND` | 依赖没解析到。见上面第 2 步 |

### 插件被自动停用（重点）

**这是本插件最容易踩的坑，0.1.0 已修掉，但你自定义配置或改用别的 profile 时仍可能触发。**

DSH 加载器的行为是：**一个插件的 `inject` 里只要有一个服务在本次 composition 里不存在，整个插件就不会激活**；随后加载器会把这一行**持久化成 `disabled: true` 写回 profile**，于是以后启动也不再尝试。

> ⚠️ **但「没激活」有两个完全不同的原因，先分清再动手**：
>
> | 症状 | 原因 | 处理 |
> |---|---|---|
> | 依赖注入不满足 | `inject` 里有服务缺失 | 本节下面 |
> | **模块根本加载不了** | 依赖解析失败（**最常见**） | 见下面「模块加载失败」 |
>
> 第二种的典型表现是 **`apply()` 压根没被调用**，所以写在 `apply` 里的任何日志都不会出现，看日志会误判为「注入失败」。

本插件最初声明了 `inject: ['tools', 'sessionProjections']`。但 **desktop profile 不挂载 `sessionProjections`**（web profile 挂载），于是四个本地工具连同界面一起被停用，表现就是「什么都没有」。

#### 模块加载失败（真正的大坑）

**加载器把插件包按真实路径解析（symlink 会被解开）。** 如果插件目录在工作区里、靠 profile 的软链挂进去，Node 会从**工作区的真实路径**往上找 `node_modules` —— 那里没有 DSH 的包，import 直接失败。

更隐蔽的是**只补了部分依赖**的情况：补几个包能过 `@deepseek-ai/schemastery`，但 `@deepseek-ai/dsh-tools` 自己还会 import `@deepseek-ai/dsh-scope`、`dsh-sandbox`、`dsh-llm`… —— 这些是 dsh 自带、**没有写进 dsh-tools 的 package.json**。于是照样 `ERR_MODULE_NOT_FOUND`，而报错只在你手动 import 时才看得见。

**判别方法**：手动按包名 import 一次：

```powershell
$probe = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\@dsh-plugin\_probe"
New-Item -ItemType Directory -Force $probe | Out-Null
Set-Content "$probe\t.mjs" -Encoding UTF8 -Value @'
const mod = await import('@dsh-plugin/tokusatsu-gunpla')
console.log('import OK, inject =', JSON.stringify(mod.inject))
'@
& (Get-Command node).Source "$probe\t.mjs"
Remove-Item $probe -Recurse -Force
```

报 `ERR_MODULE_NOT_FOUND` 就是这个问题。

**修法**：让插件的 `node_modules` 能解析**整套 dsh 依赖**，而不是只补几个。本仓库的 `scripts/install-deps.mjs` 就是干这个的 —— 它把 profile 里整套 `@deepseek-ai` 作用域链（240 个包）进插件的 `node_modules`，开发机离线也能用：

```bash
node scripts/install-deps.mjs
```

> ⚠️ `package.json` 的 `dependencies` 只声明插件**直接** import 的 5 个包。dsh 内部包之间的相互引用不在任何清单里，所以**必须整套链**，不能只按 `dependencies` 补。手工 `pnpm install` 或用 `--config.node-linker=hoisted` 都补不全。

#### 依赖注入缺失

先诊断，确认插件到底有没有被停用：

```bash
node scripts/verify-profile.mjs desktop
```

它会离线重放 desktop profile 的完整 composition 并打印插件行：

```
PASS  the composition provides "tools"
note: session projection available in this composition (optional)
PASS  the plugin row is present in the composition
PASS  the row is explicitly enabled
row: {"id":"tokusatsu-gunpla","name":"@dsh-plugin/tokusatsu-gunpla","disabled":false,...}
```

看到 `the plugin row itself is not left disabled` 失败，或行里出现 `"disabled": true`，按下面处理。

**修法一（推荐）**：在 GUI 的 **设置 → 插件** 里把 `tokusatsu-gunpla` 打开。这是应用官方入口，会自己把 `disabled: false` 写回 profile。

**修法二**：在 `cordis.patch.yml` 里**显式**写 `disabled: false`：

```yaml
- insert:
    - id: tokusatsu-gunpla
      name: "@dsh-plugin/tokusatsu-gunpla"
      disabled: false      # 必须显式写；否则持久化的停用会一直生效
      config:
        richMode: false
```

**本插件的设计取舍**：`sessionProjections` 现在是**可选**依赖。它只负责把识别结果送进 Web 界面；服务不在时四个本地工具照常工作，只是结果面板没有内容可画。**少一个 UI 通道绝不能让识别引擎停摆** —— 这就是上面那个坑的教训，也是 `lib/index.js` 里 `inject` 只有 `['tools']` 的原因。

#### 落盘追踪（桌面端没有日志时用）

桌面端 `DeepSeek Harness.exe` **不提供任何可读日志**，`dsh --profile desktop --dump-config` 也会被拒（profile 由 Electron 独占管理）。所以插件在 `apply()` 第一行写一个崩溃安全的追踪文件：

```
$DSH_HOME/plugin-data/tokusatsu-gunpla/boot-trace.log
```

| 文件内容 | 结论 |
|---|---|
| **文件不存在** | `apply()` 没被调用 → **模块加载失败**，按上面处理 |
| 有 `apply() entered`、没有 `tools registered` | 注册工具时抛异常，堆栈也记在同一文件 |
| 三条都在 | `apply()` 成功；若界面仍无，问题在 inject 或加载器层 |

---

## 欧盟用户

本插件开源、数据本地、非高风险用途，按 EU AI Act 基本属豁免范围。插件仍会显示 GDPR / EU AI Act 说明（把 `showCompliance` 设为 `true`）。详见 README 的合规段落。
