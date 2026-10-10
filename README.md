# 墨学 · 学写汉字小程序

一个基于微信原生小程序 + [hanzi-writer](https://github.com/chanind/hanzi-writer) 的开源「学写汉字 / 硬笔书法」练习小程序。

核心能力：**笔顺动画演示、描红跟写、笔顺测验、田字格辅助、练习记录与收藏**。

## 设计取向（成本优先）

- **纯本地存储**：练习记录/收藏存本地，零后端、零服务器成本。
- **小字库内置 + 大库按需缓存**：笔画数据默认从 jsDelivr CDN 按需下载并写入本地文件缓存，既控制小程序包体（主包 2MB / 分包合计 20MB），又能离线复用。
- **工具类目定位**：面向「笔顺查询 / 练字工具」，规避教育类目资质门槛。
- **组件已内置（vendored）**：`hanzi-writer` 及小程序封装放在 `vendor/hanzi-writer/`，**无需 `npm install`、无需「构建 npm」**，克隆即可用。已修补新版基础库下 `Path2D` 导致的空白问题。

## 目录结构

```
.
├── app.js / app.json / app.wxss      # 全局逻辑与主题
├── project.config.json               # 开发者工具项目配置
├── data/
│   ├── commonChars.js                # 字库分类与「每日一字」字池（仅字符）
│   └── embedded.js                   # 可选：预置内置笔画数据
├── utils/
│   ├── config.js                     # CDN、域名等配置
│   ├── charData.js                   # 字库加载：内存 -> 内置 -> 本地缓存 -> CDN
│   └── storage.js                    # 练习记录与收藏
├── vendor/
│   └── hanzi-writer/                 # 内置的 hanzi-writer + 小程序组件（免构建）
└── pages/
    ├── index/                        # 首页：搜索、每日一字、分类
    ├── category/                     # 字库列表
    ├── practice/                     # 练字：演示 / 描红 / 测验
    └── profile/                      # 我的：统计、收藏、记录
```

## 快速开始

1. 用微信开发者工具打开本项目根目录（**无需 npm install / 构建 npm**）。
2. 配置服务器域名（二选一）：
   - 开发阶段：开发者工具 **详情 → 本地设置** 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」；
   - 正式发布：微信公众平台 **开发 → 开发设置 → 服务器域名**，把 `https://cdn.jsdelivr.net` 加入 **request 合法域名**。
3. `project.config.json` 中的 `appid` 为占位，正式开发请替换为自己的小程序 AppID。

> 组件已在 `vendor/hanzi-writer/` 内置，并做了两处兼容修补：
> 1. 新版基础库暴露全局 `Path2D`，`new Path2D(pathString)` 在小程序不可用会导致空白——已强制走微信兼容绘制分支；
> 2. 字库数据就绪与 canvas 初始化存在竞态——练字页会等待画布节点就绪后再渲染。

## 字库策略说明

| 层级 | 位置 | 作用 |
| --- | --- | --- |
| 内存缓存 | `memoryCache` | 同一次运行内避免重复解析 |
| 内置字库 | `data/embedded.js` | 需自备 `hanzi-writer-data` 后手动预置，计入包体，慎用 |
| 本地文件缓存 | `wx.env.USER_DATA_PATH/char-data` | CDN 下载后落盘，二次访问离线可用 |
| CDN 下载 | `utils/config.js` 的 `charDataCDN` | 默认数据源，按需请求单字 JSON |

**不建议**全量内置笔画数据（全量约 9000+ 字、十几 MB，会突破包体限制）。推荐内置少量高频字 + 其余按需缓存。

## 功能一览

练字（笔顺动画 / 描红 / 测验）、多格子（田/米/回宫/横线）、汉字详情、每日一字、教材同步（部编版 1-6 年级识字/写字表，册→单元→课）、教材听写、单元/册测试卷（错题进生字本）、课本古诗、成语练字、字帖生成与导出、练习海报、自由书写画板、练习轨迹、每日打卡、朗读发音。

## 上线

正式发布前请阅读 [`docs/上线指引.md`](docs/上线指引.md)（或 `上线指引.docx`）：账号/资质、**数据源本地化**、域名配置、隐私指引、提审发布与检查清单。

- 笔画数据自建托管：`node tools/fetch-strokes.mjs`（下载后上传到你的 COS/OSS/云开发存储，改 `utils/config.js` 的 `charDataCDN`）。
- 关键开关都在 `utils/config.js`（数据源、朗读开关）。

## 可扩展方向

- 拍照识别手写并评分；
- 云开发同步多端练习记录；
- 接入流量主广告变现（需累计 UV 1000+）。

## 开源协议

- 本项目：见 `LICENSE`（GPL-3.0）。
- [hanzi-writer](https://github.com/chanind/hanzi-writer)：MIT。
- 笔画数据 [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)：源自 Make Me A Hanzi / Arphic Public License。
