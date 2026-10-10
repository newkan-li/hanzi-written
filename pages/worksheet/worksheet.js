const storage = require('../../utils/storage')
const { templates } = require('../../data/templates')

const GRIDS = [
  { key: 'tian', name: '田字格' },
  { key: 'mi', name: '米字格' },
  { key: 'huigong', name: '回宫格' },
  { key: 'hline', name: '横线格' },
  { key: 'none', name: '无格' }
]

const SOURCES = [
  { key: 'current', name: '当前字表' },
  { key: 'favorites', name: '我的收藏' },
  { key: 'template', name: '字帖模板' },
  { key: 'custom', name: '自选汉字' }
]

const COLS_OPTIONS = [4, 6, 8]
const ROWS_OPTIONS = [4, 6, 8, 10]

const CANVAS_W = 690
const MARGIN = 30
const HEADER = 96
const FOOTER = 56

Page({
  data: {
    sources: SOURCES,
    source: 'current',
    grids: GRIDS,
    gridStyle: 'tian',
    templates,
    templateIndex: 0,
    customText: '',
    colsOptions: COLS_OPTIONS,
    rowsOptions: ROWS_OPTIONS,
    cols: 8,
    rows: 6,
    chars: [],
    preview: '',
    generated: false,
    canvasW: 0,
    canvasH: 0
  },

  onLoad() {
    const list = getApp().globalData.worksheetList
    if (list && list.length) {
      this.currentList = list
    }
    this.resolveChars()
  },

  onUnload() {
    if (this.data.preview) {
      const fs = wx.getFileSystemManager()
      try {
        fs.unlink({ filePath: this.data.preview })
      } catch (e) {
        /* 忽略 */
      }
    }
  },

  pickSource(e) {
    const source = e.currentTarget.dataset.key
    this.setData({ source }, () => this.resolveChars())
  },

  pickGrid(e) {
    this.setData({ gridStyle: e.currentTarget.dataset.key })
  },

  pickTemplate(e) {
    const templateIndex = Number(e.currentTarget.dataset.index)
    this.setData({ templateIndex }, () => this.resolveChars())
  },

  onCustom(e) {
    this.setData({ customText: e.detail.value })
  },

  pickCols(e) {
    this.setData({ cols: Number(e.currentTarget.dataset.value) })
  },

  pickRows(e) {
    this.setData({ rows: Number(e.currentTarget.dataset.value) })
  },

  resolveChars() {
    const { source, templateIndex, customText } = this.data
    let chars = []
    if (source === 'current') {
      chars = (this.currentList || []).slice()
      if (!chars.length) {
        chars = '永和静学思德谦恒诚'.split('')
      }
    } else if (source === 'favorites') {
      chars = storage.getFavorites().slice()
    } else if (source === 'template') {
      const tpl = templates[templateIndex] || templates[0]
      chars = tpl.lines.join('').replace(/\s/g, '').split('')
    } else {
      chars = (customText || '').split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
    }
    chars = chars.filter((c) => /[\u4e00-\u9fa5]/.test(c))
    this.setData({ chars: Array.from(new Set(chars)) })
  },

  generate() {
    const { chars, cols, rows, gridStyle } = this.data
    if (!chars.length) {
      wx.showToast({ title: '没有可生成的字', icon: 'none' })
      return
    }
    const cell = (CANVAS_W - MARGIN * 2) / cols
    const gridH = cell * rows
    const H = HEADER + gridH + FOOTER

    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const maxW = (win.windowWidth || 375) - 40
    const scale = Math.min(1, maxW / CANVAS_W)
    const displayW = Math.floor(CANVAS_W * scale)
    const displayH = Math.floor(H * scale)

    this.setData({ canvasW: displayW, canvasH: displayH }, () => {
      wx.createSelectorQuery()
        .select('#worksheet-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const info = res && res[0]
          if (!info || !info.node) {
            wx.showToast({ title: '画布初始化失败', icon: 'none' })
            return
          }
          const node = info.node
          const dpr = win.pixelRatio || 2
          node.width = CANVAS_W * dpr
          node.height = H * dpr
          const ctx = node.getContext('2d')
          ctx.scale(dpr, dpr)
          this.draw(ctx, chars, cols, rows, cell, gridStyle, H)
          this.canvasNode = node
          this.exportPreview()
        })
    })
  },

  draw(ctx, chars, cols, rows, cell, gridStyle, H) {
    ctx.fillStyle = '#fdfbf5'
    ctx.fillRect(0, 0, CANVAS_W, H)

    // 标题
    ctx.fillStyle = '#2b2b2b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '30px "Songti SC", serif'
    ctx.fillText('墨学 · 汉字练习字帖', CANVAS_W / 2, 44)
    ctx.fillStyle = '#8a8578'
    ctx.font = '18px sans-serif'
    ctx.fillText(formatDate(), CANVAS_W / 2, 76)

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = MARGIN + c * cell
        const y = HEADER + r * cell
        this.drawGrid(ctx, x, y, cell, gridStyle)
        const char = chars[(r * cols + c) % chars.length]
        ctx.fillStyle = r === 0 ? '#2b2b2b' : '#cfc7b4'
        ctx.font = `${Math.floor(cell * 0.7)}px "Songti SC", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(char, x + cell / 2, y + cell / 2)
      }
    }

    ctx.fillStyle = '#8a8578'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('坚持练习，写好每一个汉字', CANVAS_W / 2, H - FOOTER / 2)
  },

  drawGrid(ctx, x, y, size, style) {
    const gridColor = 'rgba(178,58,51,0.55)'
    const subColor = 'rgba(178,58,51,0.28)'
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = gridColor

    if (style === 'hline') {
      ctx.beginPath()
      ctx.moveTo(x, y + size / 2)
      ctx.lineTo(x + size, y + size / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y + size)
      ctx.lineTo(x + size, y + size)
      ctx.stroke()
      ctx.restore()
      return
    }
    if (style === 'none') {
      ctx.restore()
      return
    }

    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)

    ctx.strokeStyle = subColor
    ctx.beginPath()
    ctx.moveTo(x + size / 2, y)
    ctx.lineTo(x + size / 2, y + size)
    ctx.moveTo(x, y + size / 2)
    ctx.lineTo(x + size, y + size / 2)
    ctx.stroke()

    if (style === 'mi') {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + size, y + size)
      ctx.moveTo(x + size, y)
      ctx.lineTo(x, y + size)
      ctx.stroke()
    } else if (style === 'huigong') {
      ctx.strokeStyle = subColor
      ctx.strokeRect(x + size / 4, y + size / 4, size / 2, size / 2)
    }
    ctx.restore()
  },

  exportPreview() {
    wx.canvasToTempFilePath({
      canvas: this.canvasNode,
      fileType: 'png',
      success: (res) => {
        this.setData({ preview: res.tempFilePath, generated: true })
      },
      fail: () => {
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
    })
  },

  saveToAlbum() {
    if (!this.data.preview) {
      wx.showToast({ title: '请先生成', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.preview,
      success: () => wx.showToast({ title: '已保存到相册' }),
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  shareImage() {
    if (!this.data.preview) {
      wx.showToast({ title: '请先生成', icon: 'none' })
      return
    }
    wx.showShareImageMenu({
      path: this.data.preview,
      fail: () => wx.showToast({ title: '当前环境不支持分享', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return {
      title: '墨学 · 生成你的汉字练习字帖',
      path: '/pages/index/index'
    }
  }
})

function formatDate() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
