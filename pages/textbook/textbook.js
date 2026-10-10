const data = require('../../data/textbook')

Page({
  data: {
    books: data.books.map((b) => ({
      id: b.id,
      name: b.name,
      short: b.short,
      grade: b.grade,
      term: b.term,
      shiziCount: b.shiziCount,
      xieziCount: b.xieziCount
    })),
    currentBookId: '',
    book: null,
    units: [],
    mode: 'shizi',
    currentLesson: null
  },

  onLoad(options) {
    const wanted = (options && options.book) || ''
    const exists = data.books.some((b) => b.id === wanted)
    this.pickBookById(exists ? wanted : data.books[0].id)
  },

  pickBook(e) {
    this.pickBookById(e.currentTarget.dataset.id)
  },

  pickBookById(id) {
    const book = data.books.find((b) => b.id === id)
    if (!book) return
    const units = book.units.map((u) => ({
      title: u.title,
      theme: u.theme,
      lessons: u.lessons.map((lid) => ({
        id: lid,
        title: data.lessons[lid].title,
        kind: data.lessons[lid].kind
      }))
    }))
    this.setData({ currentBookId: id, book, units, currentLesson: null })
  },

  pickMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  pickLesson(e) {
    const id = e.currentTarget.dataset.id
    const L = data.lessons[id]
    if (!L) return
    this.setData({
      currentLesson: {
        id,
        title: L.title,
        kind: L.kind,
        shizi: L.shizi,
        xiezi: L.xiezi,
        words: L.words
      }
    })
  },

  tapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  tapWord(e) {
    const word = e.currentTarget.dataset.word
    const chars = word.split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
    if (!chars.length) return
    getApp().globalData.practiceList = chars
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  lessonChars() {
    const L = this.data.currentLesson
    if (!L) return []
    return Array.from(new Set([].concat(L.shizi || [], L.xiezi || [])))
  },

  practiceLesson() {
    const chars = this.lessonChars()
    if (!chars.length) return
    getApp().globalData.practiceList = chars
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  worksheetLesson() {
    const chars = this.lessonChars()
    if (!chars.length) return
    getApp().globalData.worksheetList = chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  bookChars() {
    const src = data.books.find((b) => b.id === this.data.currentBookId)
    if (!src) return []
    const set = new Set()
    src.units.forEach((u) =>
      u.lessons.forEach((lid) => {
        const L = data.lessons[lid]
        ;(L.shizi || []).forEach((c) => set.add(c))
        ;(L.xiezi || []).forEach((c) => set.add(c))
      })
    )
    return Array.from(set)
  },

  dictationLesson() {
    const chars = this.lessonChars()
    if (!chars.length) return
    const app = getApp()
    app.globalData.dictationChars = chars
    app.globalData.dictationTitle = this.data.currentLesson.title
    wx.navigateTo({ url: '/pages/dictation/dictation' })
  },

  dictationBook() {
    const chars = this.bookChars()
    if (!chars.length) return
    const app = getApp()
    app.globalData.dictationChars = chars
    app.globalData.dictationTitle = this.data.book.name
    wx.navigateTo({ url: '/pages/dictation/dictation' })
  }
})
