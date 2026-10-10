const createHanziWriterContext = require('../../vendor/hanzi-writer/index')

const { loadCharData } = require('../../utils/charData')
const storage = require('../../utils/storage')

const MODES = [
  { key: 'animate', name: '演示' },
  { key: 'trace', name: '描红' },
  { key: 'quiz', name: '测验' }
]

Page({
  data: {
    modes: MODES,
    mode: 'animate',
    chars: [],
    index: 0,
    char: '',
    total: 0,
    size: 300,
    showGrid: true,
    loading: true,
    error: '',
    isFav: false,
    practiced: 0
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

    this.setData({
      chars: list,
      total: list.length,
      index,
      char,
      size,
      isFav: storage.isFavorite(char),
      practiced: record.count
    })
  },

  onReady() {
    this.createWriter()
  },

  onUnload() {
    this.destroyWriter()
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

  createWriter(charArg) {
    this.destroyWriter()
    const { mode } = this.data
    const char = charArg || this.data.char
    this.setData({ loading: true, error: '' })

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
            .then((res) => onLoad(res[0]))
            .catch(onError)
        },
        onLoadCharDataSuccess: () => {
          this.setData({ loading: false })
          this.runMode(mode)
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
      this.writerCtx.cancelQuiz()
    } catch (e) {
      /* 忽略 */
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
        highlightOnComplete: true
      })
    } else {
      this.writerCtx.quiz({
        leniency: 0.9,
        showHintAfterMisses: 3,
        highlightOnComplete: true
      })
    }
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode })
    this.runMode(mode)
  },

  replay() {
    this.runMode(this.data.mode)
  },

  toggleGrid() {
    this.setData({ showGrid: !this.data.showGrid })
  },

  toggleFav() {
    const isFav = storage.toggleFavorite(this.data.char)
    this.setData({ isFav })
    wx.showToast({ title: isFav ? '已收藏' : '已取消', icon: 'none' })
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
    this.setData({
      index: next,
      char,
      isFav: storage.isFavorite(char),
      practiced: record.count
    })
    this.createWriter(char)
  }
})
