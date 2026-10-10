const pinyinMap = require('../../data/textbookPinyin')

const TONE = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v', ü: 'v'
}

function stripTones(s) {
  let out = ''
  for (const ch of String(s || '')) out += TONE[ch] || ch
  return out.toLowerCase().replace(/[^a-z]/g, '')
}

let INDEX = null
function getIndex() {
  if (INDEX) return INDEX
  INDEX = []
  Object.keys(pinyinMap).forEach((c) => {
    const n = stripTones(pinyinMap[c])
    if (n) INDEX.push({ c, n })
  })
  return INDEX
}

Page({
  data: {
    q: '',
    chars: [],
    pinMode: false
  },

  onLoad(options) {
    const q = decodeURIComponent((options && options.q) || '')
    this.setData({ q })
    this.runSearch(q)
  },

  runSearch(q) {
    if (!q) {
      this.setData({ chars: [], pinMode: false })
      return
    }
    if (/[a-zA-Z]/.test(q)) {
      const nq = stripTones(q)
      const seen = new Set()
      const chars = []
      getIndex().forEach((it) => {
        if (chars.length >= 300) return
        if (it.n.indexOf(nq) === 0 && !seen.has(it.c)) {
          seen.add(it.c)
          chars.push(it.c)
        }
      })
      this.setData({ chars, pinMode: true })
    } else {
      const chars = q.split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
      this.setData({ chars: Array.from(new Set(chars)), pinMode: false })
    }
  },

  onInput(e) {
    const q = e.detail.value
    this.setData({ q })
    this.runSearch(q)
  },

  onSearch() {
    this.runSearch(this.data.q)
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    const index = this.data.chars.indexOf(char)
    getApp().globalData.practiceList = this.data.chars
    getApp().globalData.practiceIndex = index < 0 ? 0 : index
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onShareAppMessage() {
    return { title: '墨学 · 按拼音找字练字', path: '/pages/index/index' }
  }
})
