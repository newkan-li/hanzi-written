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

  // 朗读发音。false 时不请求任何外部 TTS（可用于合规/无网环境）。
  // 正式上线建议替换为自有 TTS 服务或「微信同声传译」插件。
  tts: {
    enabled: true,
    url: (text) =>
      'https://fanyi.baidu.com/gettts?lan=zh&text=' +
      encodeURIComponent(text) +
      '&spd=5&source=web'
  },

  // 应用信息（关于页展示）
  app: {
    name: '墨学',
    version: '0.1.0'
  },

  // 订阅消息（打卡提醒）
  // 在公众平台「订阅消息」申请模板后，把模板ID填到这里；推送需服务端定时发送（见 docs/上线指引.md）。
  subscribe: {
    enabled: false,
    tmplId: ''
  }
}
