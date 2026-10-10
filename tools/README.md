# tools

开发期辅助脚本（**不打包进小程序**，仅需 Node 18+，无第三方依赖）。

## gen-data.mjs —— 生成教材数据

从开源数据集 [`fsiceangel/zishi`](https://github.com/fsiceangel/zishi)（部编版小学语文生字表）生成：

| 输出 | 内容 |
| --- | --- |
| `data/textbook.js` | 册/单元/课 + 识字表/写字表/例词 |
| `data/textbookPinyin.js` | 2999 字拼音表 |
| `data/poems.js` | 课本古诗 113 首 |

```bash
node tools/gen-data.mjs
node tools/gen-data.mjs --src <基地址> --out ./data
```

> `data/idioms.js`（成语）与 `data/charInfo.js`（字典）为手工整理，不在本脚本内。

## gen-themes.mjs —— 按主题归类课本汉字

把**课本出现的字**按 5 个主题归类，生成 `data/themeChars.js`（字库分类用）：

```bash
node tools/gen-themes.mjs
```

- 自然 / 品德 / 入门：主题词表种子 ∩ 课本字集。
- 古诗名句：课本古诗用字 ∩ 课本字集（去除已归类的）。
- 日常常用：剩余课本字（按出现顺序取前 400）。
- 语义分类为**启发式**，可扩充 `tools/gen-themes.mjs` 里的 `SEEDS` 词表后重跑。

## gen-dict.mjs —— 生成汉字字典

为小程序用到的汉字（教材 ∪ 成语 ∪ 古诗 ∪ 手工字典）生成 `data/charDict.js`：
**拼音 / 部首 / 笔画 / 结构 / 释义**。

```bash
node tools/gen-dict.mjs
```

- 数据源：`pwxcoo/chinese-xinhua`（部首/笔画/拼音/释义）+ `skishore/makemeahanzi`（部首/IDS 分解→结构）。
- 首次运行会下载较大文件（word.json ≈27MB、dictionary.txt ≈2.5MB），并缓存到系统临时目录，之后复用。
- 练字页「汉字详情」优先用 `data/charInfo.js`（手工精校），缺失字段回退 `data/charDict.js`。

## fetch-strokes.mjs —— 下载笔画数据（自建托管）

把教材汉字的 hanzi-writer 笔画数据下载到本地，用于上传到自有存储、摆脱 jsDelivr。

```bash
node tools/fetch-strokes.mjs --out ./dist-strokes --concurrency 6
```

产出 `dist-strokes/<字>.json`。上传到 COS/OSS/云开发存储后，把
`utils/config.js` 的 `charDataCDN` 改成你的域名。详见 [`../docs/上线指引.md`](../docs/上线指引.md)。

## 注意

- 这些脚本会发起网络请求；请在网络可访问 `raw.githubusercontent.com` / `cdn.jsdelivr.net` 的环境运行。
- 重新生成数据后，建议重启开发者工具以刷新编译缓存。
