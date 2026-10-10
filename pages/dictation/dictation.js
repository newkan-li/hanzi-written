const pinyin = require('../../data/textbookPinyin')
const config = require('../../utils/config')
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
    index: 0,
    total: 0,
    char: '',
    pinyinText: '',
    options: [],
    answered: false,
    correct: false,
    picked: '',
    score: 0,
    finished: false
  },

  onLoad() {
    const app = getApp()
    const chars = (app.globalData.dictationChars || []).slice()
    app.globalData.dictationChars = null
    this.chars = shuffle(chars)
    this.setData({ title: app.globalData.dictationTitle || '听写', total: this.chars.length })
    app.globalData.dictationTitle = null
    if (!this.chars.length) {
      wx.showToast({ title: '没有可听写的字', icon: 'none' })
      return
    }
    this.buildQuestion()
  },

  onUnload() {
    if (this._audio) {
      this._audio.destroy()
      this._audio = null
    }
  },

  buildQuestion() {
    const char = this.chars[this.data.index]
    const distractors = []
    const pool = shuffle(POOL)
    for (let i = 0; i < pool.length && distractors.length < 3; i += 1) {
      if (pool[i] !== char) distractors.push(pool[i])
    }
    this.setData({
      char,
      pinyinText: pinyin[char] || '',
      options: shuffle([char].concat(distractors)),
      answered: false,
      correct: false,
      picked: ''
    })
    this.speak(char)
  },

  onPick(e) {
    if (this.data.answered) return
    const picked = e.currentTarget.dataset.char
    const correct = picked === this.data.char
    if (!correct) storage.addWeak(this.data.char)
    this.setData({
      answered: true,
      correct,
      picked,
      score: this.data.score + (correct ? 1 : 0)
    })
  },

  next() {
    const next = this.data.index + 1
    if (next >= this.data.total) {
      this.setData({ finished: true })
      return
    }
    this.setData({ index: next })
    this.buildQuestion()
  },

  restart() {
    this.chars = shuffle(this.chars)
    this.setData({ index: 0, score: 0, finished: false })
    this.buildQuestion()
  },

  speak(char) {
    const c = char || this.data.char
    if (!c || !config.tts || !config.tts.url) return
    if (this._audio) {
      this._audio.destroy()
      this._audio = null
    }
    const audio = wx.createInnerAudioContext()
    audio.src = config.tts.url(c)
    audio.play()
    this._audio = audio
  },

  replay() {
    this.speak(this.data.char)
  },

  exit() {
    wx.navigateBack()
  }
})
