const pinyin = require('../../data/textbookPinyin')
const storage = require('../../utils/storage')

const POOL = Object.keys(pinyin)

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

Page({
  data: {
    title: '',
    total: 0,
    index: 0,
    question: null,
    answered: false,
    correct: false,
    picked: '',
    score: 0,
    finished: false,
    wrong: []
  },

  onLoad() {
    const app = getApp()
    const chars = (app.globalData.quizChars || []).slice()
    app.globalData.quizChars = null
    this.setData({ title: app.globalData.quizTitle || '测试卷' })
    app.globalData.quizTitle = null
    this.srcChars = chars
    if (!chars.length) {
      wx.showToast({ title: '没有可测试的字', icon: 'none' })
      return
    }
    this.build()
  },

  build() {
    const chars = shuffle(this.srcChars).slice(0, 10)
    this.questions = chars.map((c) => this.makeQuestion(c))
    this.setData({ total: this.questions.length, index: 0, score: 0, finished: false, wrong: [] })
    this.show(0)
  },

  makeQuestion(char) {
    const py = pinyin[char] || ''
    const type = Math.random() < 0.5 ? 'py2char' : 'char2py'
    if (type === 'py2char') {
      const options = [char]
      let guard = 0
      while (options.length < 4 && guard < 200) {
        guard += 1
        const c = POOL[Math.floor(Math.random() * POOL.length)]
        if (c !== char && options.indexOf(c) < 0) options.push(c)
      }
      return {
        type,
        char,
        pinyin: py,
        prompt: py,
        answer: char,
        optionIsChar: true,
        options: shuffle(options)
      }
    }
    const options = [py]
    let guard = 0
    while (options.length < 4 && guard < 200) {
      guard += 1
      const c = POOL[Math.floor(Math.random() * POOL.length)]
      const p = pinyin[c]
      if (p && p !== py && options.indexOf(p) < 0) options.push(p)
    }
    return {
      type,
      char,
      pinyin: py,
      prompt: char,
      answer: py,
      optionIsChar: false,
      options: shuffle(options)
    }
  },

  show(i) {
    this.setData({
      index: i,
      question: this.questions[i],
      answered: false,
      correct: false,
      picked: ''
    })
  },

  onPick(e) {
    if (this.data.answered) return
    const picked = e.currentTarget.dataset.value
    const q = this.data.question
    const correct = picked === q.answer
    const wrong = this.data.wrong.slice()
    if (!correct) {
      wrong.push({ char: q.char, pinyin: q.pinyin })
      storage.addWeak(q.char)
    }
    this.setData({
      answered: true,
      correct,
      picked,
      score: this.data.score + (correct ? 1 : 0),
      wrong
    })
  },

  next() {
    const i = this.data.index + 1
    if (i >= this.data.total) {
      this.setData({ finished: true })
      return
    }
    this.show(i)
  },

  practiceWrong() {
    const chars = this.data.wrong.map((w) => w.char)
    if (!chars.length) return
    getApp().globalData.practiceList = chars
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  exit() {
    wx.navigateBack()
  }
})
