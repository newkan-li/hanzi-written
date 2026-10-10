const { categories, dailyPool } = require('../../data/commonChars')
const textbook = require('../../data/textbook')
const poems = require('../../data/poems')
const storage = require('../../utils/storage')

function dayOfYear() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  return Math.floor((Date.now() - start.getTime()) / 86400000)
}

function pickDaily() {
  return dailyPool[dayOfYear() % dailyPool.length]
}

function allLessonIds() {
  const ids = []
  textbook.books.forEach((b) =>
    b.units.forEach((u) => u.lessons.forEach((id) => ids.push(id)))
  )
  return ids
}

function buildLesson(id) {
  const L = textbook.lessons[id]
  if (!L) return null
  const book = textbook.books.find((b) => b.units.some((u) => u.lessons.indexOf(id) > -1))
  const chars = Array.from(new Set([].concat(L.shizi || [], L.xiezi || []))).slice(0, 12)
  return {
    id,
    title: L.title,
    kind: L.kind,
    bookName: book ? book.name : '',
    bookId: book ? book.id : '',
    chars
  }
}

function pickDailyLesson() {
  const ids = allLessonIds()
  if (!ids.length) return null
  return buildLesson(ids[dayOfYear() % ids.length])
}

Page({
  data: {
    daily: '',
    query: '',
    categories,
    dailyLesson: null,
    todayPoem: null,
    books: textbook.books.map((b) => ({ id: b.id, short: b.short, name: b.name })),
    recent: []
  },

  onLoad() {
    this.setData({
      daily: pickDaily(),
      dailyLesson: this.resolveLesson(),
      todayPoem: this.resolvePoem()
    })
  },

  onShow() {
    const recent = storage
      .getRecords()
      .slice(0, 10)
      .map((it) => it.char)
    this.setData({
      recent,
      dailyLesson: this.resolveLesson(),
      todayPoem: this.resolvePoem()
    })
  },

  resolveLesson() {
    const id = storage.getPref('homeLesson', '')
    if (id) {
      const lesson = buildLesson(id)
      if (lesson) return lesson
    }
    return pickDailyLesson()
  },

  resolvePoem() {
    const id = storage.getPref('homePoem', '')
    if (id) {
      const poem = poems.find((p) => p.id === id)
      if (poem) return poem
    }
    return poems[dayOfYear() % poems.length]
  },

  onInput(e) {
    this.setData({ query: e.detail.value })
  },

  onPracticeDaily() {
    this.openPractice([this.data.daily], 0)
  },

  onSearch() {
    const chars = this.data.query
      .split('')
      .filter((c) => /[\u4e00-\u9fa5]/.test(c))
    if (!chars.length) {
      wx.showToast({ title: '请输入汉字', icon: 'none' })
      return
    }
    this.openPractice(chars, 0)
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    this.openPractice([char], 0)
  },

  onPracticeLesson() {
    const lesson = this.data.dailyLesson
    if (!lesson || !lesson.chars.length) return
    const app = getApp()
    app.globalData.practiceList = lesson.chars
    app.globalData.practiceIndex = 0
    app.globalData.practiceNote = {
      title: lesson.title,
      desc: `${lesson.bookName} · ${lesson.kind}`
    }
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onOpenTextbook(e) {
    const book = e.currentTarget.dataset.book
    wx.navigateTo({
      url: '/pages/textbook/textbook' + (book ? '?book=' + book : '')
    })
  },

  onOpenCategory(e) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: `/pages/category/category?key=${key}` })
  },

  onWorksheet() {
    getApp().globalData.worksheetList = categories[0].chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  onIdiom() {
    wx.navigateTo({ url: '/pages/idiom/idiom' })
  },

  onOpenPoem(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/poem/poem' + (id ? '?id=' + id : '') })
  },

  onMorePoem() {
    wx.navigateTo({ url: '/pages/poem/poem' })
  },

  nextLesson() {
    this.stepLesson(1)
  },

  prevLesson() {
    this.stepLesson(-1)
  },

  stepLesson(delta) {
    const ids = allLessonIds()
    if (!ids.length) return
    const cur = this.data.dailyLesson && this.data.dailyLesson.id
    let idx = ids.indexOf(cur)
    idx = idx < 0 ? 0 : (idx + delta + ids.length) % ids.length
    const lesson = buildLesson(ids[idx])
    if (lesson) {
      storage.setPref('homeLesson', ids[idx])
      this.setData({ dailyLesson: lesson })
    }
  },

  nextPoem() {
    this.stepPoem(1)
  },

  prevPoem() {
    this.stepPoem(-1)
  },

  stepPoem(delta) {
    if (!poems.length) return
    const cur = this.data.todayPoem && this.data.todayPoem.id
    let idx = poems.findIndex((p) => p.id === cur)
    idx = idx < 0 ? 0 : (idx + delta + poems.length) % poems.length
    const poem = poems[idx]
    if (poem) {
      storage.setPref('homePoem', poem.id)
      this.setData({ todayPoem: poem })
    }
  },

  onScribe() {
    wx.navigateTo({ url: '/pages/scribe/scribe' })
  },

  onPoster() {
    getApp().globalData.posterChar = this.data.daily
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  openPractice(list, index) {
    getApp().globalData.practiceList = list
    getApp().globalData.practiceIndex = index || 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onShareAppMessage() {
    return { title: '墨学 · 学写汉字，跟着笔顺练字', path: '/pages/index/index' }
  },

  onShareTimeline() {
    return { title: '墨学 · 学写汉字，跟着笔顺练字' }
  }
})
