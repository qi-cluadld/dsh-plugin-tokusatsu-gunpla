# 假面骑士DX腰带 & 万代高达识别助手

**DeepSeek Harness 插件** · 特摄 + 胶佬双修助手 · 桌面端识别，手机只负责拍照

简体中文 | [English](README.en.md) | [English (UK)](README.en-GB.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [한국어](README.ko.md) | [Русский](README.ru.md) | [Italiano](README.it.md)

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- translation-notice -->
> **关于翻译**：本文为简体中文版，是**权威版本**。其余 10 种语言由机器翻译 + 社区校对，措辞可能不准，**如有歧义以本版为准**。术语译错（尤其是 DX / CSM / 解体匠机 / 蓝闪电 这类圈内专有名词）请提 PR 修正。

---

## 这是什么

一个跑在 DeepSeek Harness 里的识别助手，专治两件事：

- **假面骑士腰带**：DX 还是 CSM？是不是 KO？
- **万代高达模型**：EG / HG / RG / MG / PG / MB / 解体匠机（Kaitai-Shou-Ki），是哪个等级？是不是盗版？

设计上只守一条线：**走本地识别时，除了「写评测」这一步，全部不调大模型。** 拍照清单、盗版判定、DX/CSM 判断、查库、来源分级、假消息过滤，全部在本机完成，零 token。**如果你配了远端识别端点（见下文「识别跑在哪里」），照片会发给该服务商，并按它的计费产生 token。**识别结果进本地缓存，重复识别同一批照片不会再算一遍。

> 本插件不是官方工具。识别仅供参考，详见 [免责声明](#免责声明)。

---

## 它能做什么

### 强制拍照要求（这是核心，不是提示）

插件会**挡住**证据不足的识别请求，而不是给个不准的答案：

| 品类 | 必须拍到 | 没盒子/没条件时 |
|---|---|---|
| **腰带** | 带扣**单独拆下**拍正反面（背面要有铭牌）、变身道具**单独拆下**拍 | 面板与带子**一体不可拆**时：整条腰带翻过来拍**面板背面铭牌**（清单自动替换掉「拆带扣」这一项），再补带子整体、电池仓、变身音 |
| **高达** | **包装盒正面**（含万代商标与等级色块） | 多角度 + 特征部位 + 购买记录 → 都不行就**手动补型号** |
| 其它 | 品牌、编号、铭牌特写 | 多角度 |

提醒出现在三个地方，跟规范一致：**启动引导页用大字**、**拍照界面常驻提示**（不是失败才提示）、**识别失败时再提示一次**。

### DX / CSM 区分逻辑

按 **材质 → 体积 → 细节 → 问音效** 的顺序打分，每一步都有明确判据：

- **材质**：金属压铸件、皮革内衬 → CSM 侧
- **体积**：比 DX 大一圈、更厚 → CSM 侧
- **细节**：激光刻字、独立编号、金属铭牌 → CSM 侧；注塑商标加年份 → DX 侧
- **音效**：有台词/BGM → 基本不是 DX；只有变身音和必杀音 → DX 侧

两项得分接近时**不猜**：返回「疑似」，把候选列出来让用户点选，用户的选择写进**纠正库**（最高优先级，后续更新不会覆盖）。

### 假消息与来源分级

来源信任度是**推导出来的**，不是标上去的：

```
官网 > X/油管官方号（需VPN）> 国内官方号（蓝闪电+认证主体+头像）
> 官方发售列表 > 当年官号宣发视频 > 大型电商/主流维基
> 当年帖子/博客 > 黄闪电UP主 > 普通UP主 > 群聊
```

**B站账号识别**：蓝闪电 = 官方；黄闪电 = 仅参考；无闪电 = 最低。
蓝闪电**还不够**——必须同时满足认证主体、自定义头像、标题**和**简介都体现玩具/模型主题。任何一项缺失就**弹窗让用户确认**，确认结果写进用户白名单，下次不再问。

**入库门槛**：至少 **2 个独立来源**一致，且至少 1 个是可入库来源。不满足标「待确认」。**AI 生成内容只展示、不入库。**

**搜索引擎**：中文 Bing 优先；百度入口可选，展示时一律标「未认证」；国外 Google、俄语 Yandex；**不使用 360 / 搜狗 / 2345**。

### 富哥模式（可选开启）

默认只覆盖大众款。开启后纳入：

- **高达**：PG / MGEX / MB / 解体匠机（Kaitai-Shou-Ki） / RE100 / FULL MECHANICS / HI-RESOLUTION / 限定 / 海外非万代 / GK
- **腰带**：CSM / CS / 食玩 / 扭蛋 / 限定 / 冷门配件

### 多语言

完整支持：**简体中文 / 繁体中文 / 英文 / 日文**。
界面翻译：韩、法、西、葡、俄、粤、越、德、意、荷、波兰。
所有语言的兜底都是英文，缺键不会露出原始 key。

**文档语言**（每种语言一份完整 README）：
[简体中文](README.md) · [English](README.en.md) · [English (UK)](README.en-GB.md) · [日本語](README.ja.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Italiano](README.it.md)

---

## 安装

### 方式一：把仓库链接发给 DSH（推荐）

```
帮我安装这个插件：https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH 会用 `plugin_manager` 的 `install_bundle` 把它装进 profile。这是**唯一被支持**的安装方式。

### 方式二：先 clone 再让 DSH 从本地目录装

```bash
git clone https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla
cd dsh-plugin-tokusatsu-gunpla/dsh-plugin-tokusatsu-gunpla
```

然后把**这个目录的绝对路径**交给 `plugin_manager`：

```
用 plugin_manager，action 用 install_bundle，target 填这个目录的绝对路径
```

### ⚠️ 不要手工装

下面这些做法**看起来能用，实际上会让插件消失**：

- 手工在 profile 的 `node_modules` 里建软链（Windows 用 junction）
- 手写 profile 的 `cordis.patch.yml` 加一行
- 把包复制到 `$DSH_HOME` 下

原因有两个，都很难自查：

1. **依赖解析会失败。** 加载器把插件包按**真实路径**解析（symlink 被解开），于是 Node 从你的工作区往上找 `node_modules`，那里没有 DSH 的包，import 直接失败。部分补齐也不行——`@deepseek-ai/dsh-tools` 自己还会 import `dsh-scope`、`dsh-sandbox`、`dsh-llm` 等**没写进它 package.json** 的包，必须整套链。
2. **加载器会记住失败。** 一行没激活，加载器就把 `disabled: true` 持久化写回 profile，之后**每次启动都不再尝试**。

这两种情况的表现完全一样：**界面和工具全都没有**，且没有日志。排查方法见 [docs/INSTALL.md](docs/INSTALL.md#插件被自动停用重点)。

详见 [docs/INSTALL.md](docs/INSTALL.md)。

---

## 配置

全部在 profile 的 `cordis.patch.yml` 里改：

| 字段 | 默认 | 说明 |
|---|---|---|
| `richMode` | `false` | 富哥模式 |
| `visionEnabled` | `true` | 是否使用本地视觉端点 |
| `visionBaseUrl` | `''` | OpenAI 兼容端点；留空自动探测 `127.0.0.1:11434 / :1234 / :8080` |
| `visionModel` | `''` | 模型名；留空用端点报的第一个 |
| `visionTimeoutMs` | `120000` | 本地推理超时 |
| `visionMaxImages` | `6` | 单次识别的图片上限 |
| `cacheTtlMs` | `86400000` | 识别缓存时长，0 关闭 |
| `searchLanguage` | `'zh'` | 检索市场语言 |
| `allowBaidu` | `false` | 是否附百度入口（一律标「未认证」） |
| `showCompliance` | `false` | 是否显示 GDPR / EU AI Act 说明 |
| `requireAcknowledgement` | `true` | 是否强制先同意免责声明 |

### 关于「本地小模型识别」

**识别在哪里跑。** 看你怎么配置，一共三种模式：

| 模式 | 照片去哪 | 说明 |
|---|---|---|
| **本地端点**（地址留空，自动探测） | 哪也不去——就留在这台机器上 | Ollama 或任何跑在 `127.0.0.1` 的 OpenAI 兼容服务。零成本，离线可用。 |
| **远端端点**（例如 Zhipu 的 `glm-5.3-flash`） | **该服务商的服务器** | 填好 base URL 和模型，再设 API key。这是你自己的配置选择。 |
| **没配模型** | 哪也不去 | 拍照清单、手动补型号、知识库照常可用；只是不开照片识别。 |

```bash
# 例：本地端点用 Ollama
ollama pull qwen2.5-vl
ollama serve        # 监听 127.0.0.1:11434
```

插件自己不会上传任何东西。只有当你把端点指向远端地址时，照片才会离开这台机器。端点不可用时不报错、不外呼——自动降级到**拍照清单 + 手动补型号**路径，仍然是零 token。

---

## 四个本地工具

装了插件后，助手能用这四个工具。它们**全部在本地执行**：

| 工具 | 作用 |
|---|---|
| `gear_identify` | 识别 + 盗版判定 + 版本判断 + 置信度；结果进缓存并发布到界面 |
| `gear_checklist` | 生成/核对拍照清单，算还缺什么 |
| `gear_decide_edition` | DX / CSM 打分与追问链 |
| `gear_knowledge` | 查库、检索计划、来源打分、交叉核对、写纠正库、写本地库 |

工具的返回值里已经带好了结论与证据链，助手**不需要**自己再猜型号——这也是省 token 的关键。

---

## 界面

三个界面位置，都通过 Harness 的 slot 系统注册：

1. **启动引导页**（对话输入区上方）：大字拍照要求 + 免责声明勾选 + 合规说明 + 富哥模式开关。**没勾同意不会出现拍照界面。**
2. **拍照引导**（常驻）：分类切换、常驻提醒横幅、可勾选的拍照清单、还缺什么的实时提示。
3. **结果面板 + 设置页**：结果卡片带置信度与证据、疑似时点选纠正；设置页管语言、富哥模式、百度入口、本地端点、免责声明与合规说明。

---

## QQ 互通（可选）

NapCat / Lagrange 或只做消息转发。**没有 QQ 也能用，核心功能不依赖 QQ。**

> ⚠️ QQ 互通有**封号风险**，账号风险由使用者自行承担。

---

## 开发

```bash
node scripts/smoke.mjs         # 69 项：拍照清单、判断树、盗版判定、来源分级、端到端
node scripts/client-test.mjs   # 43 项：客户端契约、四种语言渲染、slot 注册、i18n 兜底
```

两个测试都不需要网络，也不需要模型。

```
lib/
  index.js      插件入口、配置 schema、session projection（结果送到界面）
  tools.js      四个模型可见工具
  identify.js   识别主流程（证据 → 盗版闸门 → 匹配 → 判断 → 置信度）
  checklist.js  拍照要求引擎
  decide.js     DX/CSM 判断树
  sources.js    来源分级、B站判定、交叉核对、搜索引擎路由
  vision.js     本地视觉端点客户端 + 降级
  store.js      三层知识库（内置 seed / 已核实 / 用户纠正）
  i18n.js       语言目录、免责声明、合规说明
  client.js     浏览器半边（引导页 / 拍照引导 / 结果面板 / 设置页）
data/
  seed-catalog.json      内置条目与判据
  official-whitelist.json 官方认证主体白名单
```

本地数据目录：`$DSH_HOME/plugin-data/tokusatsu-gunpla/`。删掉它就是行使删除权。

---

## 免责声明

放启动引导页（勾选同意）、本 README、设置页三处：

1. **识别仅供参考**：本插件不是官方工具，识别结果存在误差，不保证正确。
2. **非官方工具**：与万代、东映、圆谷及任何厂商均无关联，未获授权或背书。
3. **数据来自公开网络**：条目由公开资料整理，可能过时或有误，请以官方信息为准。
4. **QQ 互通有封号风险**：如启用 QQ 转发，账号风险由使用者自行承担。
5. **AI 内容不构成购买建议**：评测与描述可能由 AI 生成，不构成投资或购买建议。
6. **开源免费按现状提供**：无任何明示或默示担保，使用风险自负。
7. **不背书国产/KO/海外第三方**：识别到仿冒品仅作提醒，不代表推荐或认可。

### GDPR / EU AI Act（欧盟用户）

- **GDPR**：识别数据默认只存在本机（`$DSH_HOME/plugin-data/tokusatsu-gunpla`），知识库绝不上传。**如果你配置了远端识别端点，照片会发送给该服务商**——那是你自己的配置；用本地端点就仍然留在这台机器上。删除本地数据目录即可行使删除权；插件不建立用户画像。
- **EU AI Act**：本插件为开源、非高风险用途的 AI 系统，仅做辅助识别与信息整理。AI 生成内容均标注来源层级，且只展示不入库。
- **透明度**：结果附带置信度与证据链，用户纠正优先于自动结果。

---

## 推广与社群

- **GitHub**：公开仓库，`dsh-plugin` topic，已提交 DSH Plugin Hub
- **QQ 群**：总群 **419573550** · 分群 **579938880**
- **B站**：视频已过审，简介待补；多语言字幕搬油管；视频带水印

### 避坑备忘

- QQ 建群需实名
- GitHub 被墙备 Gitee / jsDelivr 镜像，404 就切源
- 浏览器劫持先查 360 / 2345；推荐卡巴斯基免费版 / 火绒 / 腾讯电脑管家极简版，卸载用 Geek；360 残留需管理员权限
- 欧盟 AI 法案对「开源 + 数据本地」基本豁免
- 俄语用 Yandex / VK / RuTube
- README 机翻 + 社区校对，**以中文版为准**

---

## 许可证（License）

[MIT](LICENSE)

本插件不背书任何国产、KO 或海外第三方产品。识别到仿冒品只是提醒，不是推荐。
