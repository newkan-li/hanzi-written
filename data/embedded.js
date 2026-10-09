/**
 * 内置笔画数据（可选）
 *
 * 默认从 CDN 按需下载并缓存。若希望某些常用字离线可用、且不占用主包体积，
 * 可在安装 hanzi-writer-data 后于此处预置：
 *
 *   module.exports = {
 *     我: require('hanzi-writer-data/我'),
 *     你: require('hanzi-writer-data/你')
 *   }
 *
 * 注意：内置数据会计入小程序代码包大小（主包 2MB / 分包合计 20MB），
 * 请勿一次性内置过多汉字。
 */
module.exports = {}
