const { categories } = require('../../data/commonChars')
const poems = require('../../data/poems')

const PAGE_SIZE = 24

function poemChars(lines) {
  const set = new Set()
  ;(lines || []).join('').split('').forEach((c) => {
    if (/[\u4e00-\u9fa5]/.test(c)) set.add(c)
  })
  return Array.from(set)
}

Page({
  data: {
    isPoem: false,
    name: '',
    desc: '',
    // 汉字分页
    chars: [],
    page: 0,
    totalPages: 1,
    totalChars: 0,
    hasPrev: false,
    hasNext: false,
    // 古诗一首一页
    poem: null,
    poemIndex: 0,
    poemTotal: 0,
    hasPrevPoem: false,
    hasNextPoem: false
  },

  onLoad(options) {
    const key = options.key
    const category = categories.find((c) => c.key === key) || categories[0]
    wx.setNavigationBarTitle({ title: category.name })

    if (category.key === 'poem') {
      this.setData({ isPoem: true, name: category.name, desc: category.desc, poemTotal: poems.length })
      this.setPoem(0)
      return
    }

    this.allChars = category.chars
    this.setData({
      name: category.name,
      desc: category.desc,
      totalChars: this.allChars.length
    })
    this.setPage(0)
  },

  /* ---------- 汉字分页 ---------- */
  setPage(p) {
    const totalPages = Math.max(1, Math.ceil(this.allChars.length / PAGE_SIZE))
    const page = Math.min(Math.max(p, 0), totalPages - 1)
    const chars = this.allChars.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    this.setData({
      page,
      totalPages,
      chars,
      hasPrev: page > 0,
      hasNext: page < totalPages - 1
    })
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },

  prev() {
    if (this.data.hasPrev) this.setPage(this.data.page - 1)
  },

  next() {
    if (this.data.hasNext) this.setPage(this.data.page + 1)
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    const index = this.allChars.indexOf(char)
    getApp().globalData.practiceList = this.allChars
    getApp().globalData.practiceIndex = index < 0 ? 0 : index
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  /* ---------- 古诗一首一页 ---------- */
  setPoem(i) {
    const index = Math.min(Math.max(i, 0), poems.length - 1)
    const src = poems[index]
    const chars = poemChars(src.lines)
    this.setData({
      poem: {
        title: src.title,
        dynasty: src.dynasty,
        author: src.author,
        lines: src.lines,
        charLines: src.lines.map((l, li) =>
          l.split('').map((c, ci) => ({ c, id: li + '-' + ci }))
        ),
        chars
      },
      poemIndex: index,
      hasPrevPoem: index > 0,
      hasNextPoem: index < poems.length - 1
    })
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },

  prevPoem() {
    if (this.data.hasPrevPoem) this.setPoem(this.data.poemIndex - 1)
  },

  nextPoem() {
    if (this.data.hasNextPoem) this.setPoem(this.data.poemIndex + 1)
  },

  onTapPoemChar(e) {
    const char = e.currentTarget.dataset.char
    if (!/[\u4e00-\u9fa5]/.test(char)) return
    const src = poems[this.data.poemIndex]
    if (!src) return
    const chars = poemChars(src.lines)
    const index = chars.indexOf(char)
    const app = getApp()
    app.globalData.practiceList = chars
    app.globalData.practiceIndex = index < 0 ? 0 : index
    app.globalData.practiceNote = { title: src.title, desc: src.lines.join('') }
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  practicePoem() {
    const src = poems[this.data.poemIndex]
    if (!src) return
    const app = getApp()
    app.globalData.practiceList = poemChars(src.lines)
    app.globalData.practiceIndex = 0
    app.globalData.practiceNote = { title: src.title, desc: src.lines.join('') }
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  worksheetPoem() {
    const src = poems[this.data.poemIndex]
    if (!src) return
    getApp().globalData.worksheetList = poemChars(src.lines)
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  }
})
