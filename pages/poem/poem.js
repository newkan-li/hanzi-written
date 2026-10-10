const poems = require('../../data/poems')
const textbook = require('../../data/textbook')

const BOOKS = textbook.books.map((b) => ({ id: b.id, short: b.short, name: b.name }))

function chineseChars(lines) {
  const set = new Set()
  lines.join('').split('').forEach((c) => {
    if (/[\u4e00-\u9fa5]/.test(c)) set.add(c)
  })
  return Array.from(set)
}

Page({
  data: {
    books: BOOKS,
    currentBookId: '',
    list: [],
    currentPoem: null
  },

  onLoad(options) {
    const id = options && options.id
    if (id) {
      const poem = poems.find((p) => p.id === id)
      if (poem) {
        this.setData({ currentBookId: poem.book, currentPoem: poem })
        this.loadBook(poem.book)
        return
      }
    }
    this.loadBook(BOOKS[0].id)
  },

  loadBook(bookId) {
    this.setData({
      currentBookId: bookId,
      list: poems.filter((p) => p.book === bookId)
    })
  },

  pickBook(e) {
    const bookId = e.currentTarget.dataset.id
    this.setData({ currentPoem: null })
    this.loadBook(bookId)
  },

  pickPoem(e) {
    const id = e.currentTarget.dataset.id
    const poem = poems.find((p) => p.id === id)
    this.setData({ currentPoem: poem || null })
  },

  practicePoem() {
    const poem = this.data.currentPoem
    if (!poem) return
    const chars = chineseChars(poem.lines)
    if (!chars.length) return
    const app = getApp()
    app.globalData.practiceList = chars
    app.globalData.practiceIndex = 0
    app.globalData.practiceNote = { title: poem.title, desc: `${poem.dynasty}·${poem.author}` }
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  worksheetPoem() {
    const poem = this.data.currentPoem
    if (!poem) return
    const app = getApp()
    app.globalData.worksheetList = chineseChars(poem.lines)
    app.globalData.worksheetPoem = {
      title: poem.title,
      dynasty: poem.dynasty,
      author: poem.author,
      lines: poem.lines
    }
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  }
})
