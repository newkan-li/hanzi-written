const { categories } = require('../../data/commonChars')
const textbook = require('../../data/textbook')

Page({
  data: {
    categories,
    books: textbook.books.map((b) => ({
      id: b.id,
      name: b.name,
      short: b.short,
      grade: b.grade,
      term: b.term,
      shiziCount: b.shiziCount,
      xieziCount: b.xieziCount
    })),
    grades: [1, 2, 3, 4, 5, 6].map((g) => ({
      grade: g,
      books: textbook.books
        .filter((b) => b.grade === g)
        .map((b) => ({ id: b.id, short: b.short, name: b.name }))
    }))
  },

  onOpenBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/textbook/textbook?book=' + id })
  },

  onOpenCategory(e) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: `/pages/category/category?key=${key}` })
  },

  onOpenTextbook() {
    wx.navigateTo({ url: '/pages/textbook/textbook' })
  },

  onOpenPoem() {
    wx.navigateTo({ url: '/pages/poem/poem' })
  },

  onOpenWorksheet() {
    getApp().globalData.worksheetList = categories[0].chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  onOpenIdiom() {
    wx.navigateTo({ url: '/pages/idiom/idiom' })
  },

  onShareAppMessage() {
    return { title: '墨学 · 教材同步练字字库', path: '/pages/library/library' }
  },

  onShareTimeline() {
    return { title: '墨学 · 教材同步练字字库' }
  }
})
