/**
 * 全局配置（上线时重点改这里）
 */
module.exports = {
  // 笔画数据源（hanzi-writer-data 单字 JSON 的基地址，末尾不带斜杠）。
  //
  // 开发期用 jsDelivr；但国内访问 jsDelivr 常不稳定，正式上线建议改为
  // 国内可达的静态托管（微信云开发存储 / 腾讯云 COS / 阿里云 OSS / 自建 CDN）。
  //
  // 数据文件名规则：<字>.json（如 我.json）。可用 tools/fetch-strokes.mjs
  // 批量下载后上传到你自己的存储桶，再把这里改成你的域名。
  //
  // 例：charDataCDN: 'https://your-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/hanzi-data'
  charDataCDN: 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest',

  // 朗读发音。多音源自动降级（第 1 个失败自动试第 2 个）。
  // false/空数组时不朗读。正式上线建议替换为自有 TTS 或「微信同声传译」插件，
  // 并把所用域名加入 request 合法域名。
  tts: {
    enabled: true,
    sources: [
      (text) =>
        'https://fanyi.baidu.com/gettts?lan=zh&text=' +
        encodeURIComponent(text) +
        '&spd=5&source=web',
      (text) => 'https://dict.youdao.com/dictvoice?type=2&audio=' + encodeURIComponent(text)
    ]
  },

  // 应用信息（关于页展示）
  app: {
    name: '墨学',
    version: '0.1.0'
  },

  // 微信云开发（可选；默认关闭，不影响本地功能）
  // 开通云开发后：把 enabled 置 true、填 env（环境ID）。
  cloud: {
    enabled: false,
    // 环境 ID，如 'moxue-1a2b3c'
    env: '',
    // 云存储中「笔画数据目录」的 fileID 前缀（用 tools/fetch-strokes.mjs 上传后得到），
    // 形如 'cloud://moxue-1a2b3c.xxxx/hanzi-data'（末尾不带斜杠）
    charDataRoot: '',
    // 是否启用云数据库同步（记录/收藏/生字本/学习记录/偏好）
    sync: false
  },

  // 订阅消息（打卡提醒）
  // 在公众平台「订阅消息」申请模板后，把模板ID填到这里；推送需服务端定时发送（见 docs/上线指引.md）。
  subscribe: {
    enabled: false,
    tmplId: ''
  }
}
