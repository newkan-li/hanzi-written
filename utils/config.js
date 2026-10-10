/**
 * 全局配置
 */
module.exports = {
  // 笔画数据 CDN（jsDelivr 托管的 hanzi-writer-data）
  // 需在微信后台「开发设置 - 服务器域名」把 cdn.jsdelivr.net 加入 request 合法域名，
  // 或在开发者工具中勾选「不校验合法域名」。
  charDataCDN: 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest',

  // 朗读音源（零后端方案：使用公开 TTS 接口）。
  // 如需替换为自有 TTS 或同声传译插件，改这里的 url 即可；
  // 正式发布请把域名加入 request 合法域名。
  tts: {
    url: (text) =>
      'https://fanyi.baidu.com/gettts?lan=zh&text=' +
      encodeURIComponent(text) +
      '&spd=5&source=web'
  }
}
