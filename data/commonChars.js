/**
 * 字库分类与「每日一字」字池
 *
 * 分类字表来自「课本汉字按主题归类」：`data/themeChars.js`
 * （由 `tools/gen-themes.mjs` 生成，仅含部编版课本出现的字）。
 */
const themeChars = require('./themeChars')

const categories = [
  { key: 'basic', name: '入门基础', desc: '数字 · 方位 · 基础字', chars: themeChars.basic },
  { key: 'daily', name: '日常常用', desc: '高频 · 生活', chars: themeChars.daily },
  { key: 'nature', name: '自然万物', desc: '天地 · 草木 · 鸟兽', chars: themeChars.nature },
  { key: 'virtue', name: '品德修养', desc: '仁义 · 礼智 · 诚信', chars: themeChars.virtue },
  { key: 'poem', name: '古诗名句', desc: '课本古诗用字', chars: themeChars.poem }
]

const dailyPool = ['永', '和', '静', '学', '思', '德', '谦', '恒', '诚', '雅', '墨', '韵', '书', '心', '志', '勤']

module.exports = { categories, dailyPool }
