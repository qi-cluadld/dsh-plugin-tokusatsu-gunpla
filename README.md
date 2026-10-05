# dsh-plugin-tokusatsu-gunpla

藏宝图 → [dsh-plugin-tokusatsu-gunpla/](dsh-plugin-tokusatsu-gunpla/)

**假面骑士 DX 腰带 & 万代高达识别助手** —— 一个 DeepSeek Harness 插件。

拍照 → 本机识别 → 对照知识库 → 出结论。识别、判断、查库**全部在本机完成，不花 token**；只有你要求写评测时才会调用大模型。

## 仓库结构

| 路径 | 内容 |
|---|---|
| `dsh-plugin-tokusatsu-gunpla/` | 插件本体（代码、数据、文档、测试） |

代码放在子目录里，是为了以后可以在这一个仓库里加第二个插件。

## 装它

把下面这句直接发给 DSH：

```
帮我安装这个插件：https://github.com/qi-cluadld/dsh-plugin-tokusatsu-gunpla/tree/main/dsh-plugin-tokusatsu-gunpla
```

DSH 会用 `plugin_manager` 的 `install_bundle` 装进 profile。**这是唯一被支持的安装方式**——手工建软链、手写 `cordis.patch.yml` 都会让插件静默消失，原因见插件文档的安装说明。

## 文档

插件说明共 11 种语言：

- [简体中文](dsh-plugin-tokusatsu-gunpla/README.md) · [English](dsh-plugin-tokusatsu-gunpla/README.en.md) · [English (UK)](dsh-plugin-tokusatsu-gunpla/README.en-GB.md) · [日本語](dsh-plugin-tokusatsu-gunpla/README.ja.md)
- [Deutsch](dsh-plugin-tokusatsu-gunpla/README.de.md) · [Français](dsh-plugin-tokusatsu-gunpla/README.fr.md) · [Español](dsh-plugin-tokusatsu-gunpla/README.es.md) · [Português](dsh-plugin-tokusatsu-gunpla/README.pt.md)
- [한국어](dsh-plugin-tokusatsu-gunpla/README.ko.md) · [Русский](dsh-plugin-tokusatsu-gunpla/README.ru.md) · [Italiano](dsh-plugin-tokusatsu-gunpla/README.it.md)
- [安装与排错](dsh-plugin-tokusatsu-gunpla/docs/INSTALL.md)

## 免责声明

本插件为**非官方工具**，与万代、东映、圆谷及任何厂商均无关联，未获授权或背书。识别结果仅供参考，不构成购买建议。数据来自公开资料整理，可能过时或有误，请以官方信息为准。

## License

[MIT](dsh-plugin-tokusatsu-gunpla/LICENSE)
