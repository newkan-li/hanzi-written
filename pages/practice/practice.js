const createHanziWriterContext = require('../../vendor/hanzi-writer/index')

const { loadCharData } = require('../../utils/charData')
const storage = require('../../utils/storage')
const config = require('../../utils/config')
const { charInfo } = require('../../data/charInfo')

const MODES = [
  { key: 'animate', name: '演示' },
  { key: 'trace', name: '描红' },
  { key: 'quiz', name: '测验' }
]

const GRIDS = [
  { key: 'tian', name: '田' },
  { key: 'mi', name: '米' },
  { key: 'huigong', name: '回' },
  { key: 'hline', name: '横' },
  { key: 'none', name: '无' }
]

Page({
  data: {
    modes: MODES,
    mode: 'animate',
    gridStyles: GRIDS,
    gridStyle: 'tian',
    chars: [],
    index: 0,
    char: '',
    total: 0,
    size: 300,
    loading: true,
    error: '',
    isFav: false,
    practiced: 0,
    note: null,
    info: { pinyin: '', radical: '—', structure: '—', strokes: '—', words: [], meaning: '—' }
  },

  onLoad() {
    const app = getApp()
    const list =
      app.globalData.practiceList && app.globalData.practiceList.length
        ? app.globalData.practiceList
        : ['永']
    const index = Math.min(
      Math.max(app.globalData.practiceIndex || 0, 0),
      list.length - 1
    )
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const size = Math.floor((info.windowWidth || 375) * 0.8)
    const char = list[index]
    const record = storage.addRecord(char)
    storage.checkin()
    const note = app.globalData.practiceNote || null
    app.globalData.practiceNote = null

    this.setData({
      chars: list,
      total: list.length,
      index,
      char,
      size,
      note,
      gridStyle: storage.getPref('gridStyle', 'tian'),
      isFav: storage.isFavorite(char),
      practiced: record.count
    })
  },

  onShow() {
    if (this.data.char) {
      this.setData({
        isFav: storage.isFavorite(this.data.char),
        practiced: storage.getRecord(this.data.char).count
      })
    }
  },

  onReady() {
    this._unloaded = false
    // 稍等布局稳定后再创建，规避 Canvas 2D 同层渲染的位置错位
    setTimeout(() => {
      if (!this._unloaded) this.createWriter()
    }, 60)
  },

  onUnload() {
    this._unloaded = true
    this.destroyWriter()
    if (this._audio) {
      this._audio.destroy()
      this._audio = null
    }
  },

  waitForCanvas() {
    return new Promise((resolve) => {
      const start = Date.now()
      const tryQuery = () => {
        const comp = this.selectComponent && this.selectComponent('#hz-writer')
        if (comp) {
          comp
            .createSelectorQuery()
            .select('#writer-canvas')
            .fields({ node: true })
            .exec((res) => {
              const info = res && res[0]
              if (info && info.node) {
                setTimeout(resolve, 30)
              } else if (Date.now() - start > 3000) {
                resolve()
              } else {
                setTimeout(tryQuery, 16)
              }
            })
        } else if (Date.now() - start > 3000) {
          resolve()
        } else {
          setTimeout(tryQuery, 16)
        }
      }
      tryQuery()
    })
  },

  updateInfo(char, data) {
    const dict = charInfo[char] || {}
    this.setData({
      info: {
        pinyin: dict.pinyin || '—',
        radical: dict.radical || '—',
        structure: dict.structure || '—',
        strokes: data && data.strokes ? data.strokes.length : '—',
        words: dict.words || [],
        wordsText: dict.words ? dict.words.join(' / ') : '—',
        meaning: dict.meaning || '—'
      }
    })
  },

  createWriter(charArg) {
    const char = charArg || this.data.char
    this.setData({
      loading: true,
      error: '',
      info: { pinyin: '', radical: '—', structure: '—', strokes: '—', words: [], meaning: '—' }
    })

    // 复用同一个 writer 实例：setCharacter 会取消上一次动画并加载新字，
    // 避免多个实例同时在同一画布上渲染（表现为“同时画好几个字”）。
    if (this.writerCtx) {
      try {
        this.writerCtx.setCharacter(char)
      } catch (e) {
        this.setData({
          loading: false,
          error: '切换失败：' + (e && e.message ? e.message : e)
        })
      }
      return
    }

    try {
      this.writerCtx = createHanziWriterContext({
        id: 'hz-writer',
        character: char,
        page: this,
        padding: 8,
        showOutline: true,
        strokeColor: '#2b2b2b',
        radicalColor: '#b23a33',
        highlightColor: '#e0b84c',
        drawingColor: '#2b2b2b',
        drawingWidth: 24,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 250,
        charDataLoader: (c, onLoad, onError) => {
          Promise.all([loadCharData(c), this.waitForCanvas()])
            .then((res) => {
              this.updateInfo(c, res[0])
              onLoad(res[0])
            })
            .catch(onError)
        },
        onLoadCharDataSuccess: () => {
          this.setData({ loading: false })
          this.runMode(this.data.mode)
        },
        onLoadCharDataError: () => {
          this.setData({
            loading: false,
            error: '字库加载失败，请检查网络或域名白名单'
          })
        }
      })
    } catch (e) {
      this.setData({
        loading: false,
        error: '初始化失败：' + (e && e.message ? e.message : e)
      })
    }
  },

  destroyWriter() {
    if (!this.writerCtx) return
    try {
      this.writerCtx.destroy()
    } catch (e) {
      try {
        this.writerCtx.cancelQuiz()
      } catch (err) {
        /* 忽略 */
      }
    }
    this.writerCtx = null
  },

  runMode(mode) {
    if (!this.writerCtx) return
    try {
      this.writerCtx.cancelQuiz()
    } catch (e) {
      /* 忽略 */
    }

    if (mode === 'animate') {
      this.writerCtx.animateCharacter()
    } else if (mode === 'trace') {
      this.writerCtx.quiz({
        leniency: 1.4,
        showHintAfterMisses: 1,
        markStrokeCorrectAfterMisses: 2,
        highlightOnComplete: true,
        onMistake: () => storage.addWeak(this.data.char),
        onComplete: () => this.onQuizComplete()
      })
    } else {
      this.writerCtx.quiz({
        leniency: 0.9,
        showHintAfterMisses: 3,
        highlightOnComplete: true,
        onMistake: () => storage.addWeak(this.data.char),
        onComplete: () => this.onQuizComplete()
      })
    }
  },

  onQuizComplete() {
    wx.showToast({ title: '写好了！', icon: 'success' })
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode })
    this.runMode(mode)
  },

  onSelectGrid(e) {
    const gridStyle = e.currentTarget.dataset.key
    this.setData({ gridStyle })
    storage.setPref('gridStyle', gridStyle)
  },

  onWordTap(e) {
    const word = e.currentTarget.dataset.word || ''
    const chars = word.split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
    if (!chars.length) return
    const record = storage.addRecord(chars[0])
    this.setData({
      chars,
      total: chars.length,
      index: 0,
      char: chars[0],
      isFav: storage.isFavorite(chars[0]),
      practiced: record.count
    })
    this.createWriter(chars[0])
  },

  replay() {
    this.runMode(this.data.mode)
  },

  toggleFav() {
    const isFav = storage.toggleFavorite(this.data.char)
    this.setData({ isFav })
    wx.showToast({ title: isFav ? '已收藏' : '已取消', icon: 'none' })
  },

  speak() {
    const char = this.data.char
    if (this._audio) {
      this._audio.destroy()
      this._audio = null
    }
    if (!config.tts || !config.tts.enabled || !config.tts.url) {
      wx.showToast({ title: '未配置朗读音源', icon: 'none' })
      return
    }
    const audio = wx.createInnerAudioContext()
    audio.src = config.tts.url(char)
    audio.onError(() => {
      wx.showToast({ title: '朗读失败，请在 config.js 配置音源', icon: 'none' })
    })
    audio.play()
    this._audio = audio
  },

  makeWorksheet() {
    getApp().globalData.worksheetList = this.data.chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  makePoster() {
    getApp().globalData.posterChar = this.data.char
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  openScribe() {
    getApp().globalData.scribeChar = this.data.char
    wx.navigateTo({ url: '/pages/scribe/scribe' })
  },

  go(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    const total = this.data.total
    if (total <= 1) {
      wx.showToast({ title: '只有一个字，去字库或搜索练更多', icon: 'none' })
      return
    }
    const next = (this.data.index + delta + total) % total
    const char = this.data.chars[next]
    const record = storage.addRecord(char)
    releaseAudio(this)
    this.setData({
      index: next,
      char,
      isFav: storage.isFavorite(char),
      practiced: record.count
    })
    this.createWriter(char)
  }
})

function releaseAudio(page) {
  if (page._audio) {
    page._audio.destroy()
    page._audio = null
  }
}
