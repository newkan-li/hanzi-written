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

const LAYOUTS = [
  { key: 'grid', name: '字表排版' },
  { key: 'poem', name: '诗句排版' }
]

// 打印尺寸（A4 300dpi，按真实厘米排版）
const CM = 300 / 2.54 // 118.11 px/cm
const PAGE_W = Math.round(21.0 * CM) // 2480
const PAGE_H = Math.round(29.7 * CM) // 3508
const SIDE = Math.round(1.0 * CM)
const HEADER = Math.round(2.6 * CM)
const FOOTER = Math.round(1.8 * CM)
const LINE_GAP = Math.round(0.3 * CM)

const CELL_OPTIONS = [
  { key: '1.2', name: '小 1.2cm' },
  { key: '1.5', name: '中 1.5cm' },
  { key: '2.0', name: '大 2.0cm' }
]
const TRACE_OPTIONS = [0, 1, 2]

function cnChars(str) {
  return (str || '').split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
}

Page({
  data: {
    sources: SOURCES,
    source: 'current',
    grids: GRIDS,
    gridStyle: 'tian',
    templates,
    templateIndex: 0,
    customText: '',
    layouts: LAYOUTS,
    layout: 'grid',
    poem: null,
    cellOptions: CELL_OPTIONS,
    cellCm: '1.5',
    traceOptions: TRACE_OPTIONS,
    traceRows: 1,
    chars: [],
    preview: '',
    generated: false,
    canvasW: 0,
    canvasH: 0
  },

  onLoad() {
    const app = getApp()
    const list = app.globalData.worksheetList
    if (list && list.length) this.currentList = list
    const poem = app.globalData.worksheetPoem
    app.globalData.worksheetPoem = null
    if (poem && poem.lines && poem.lines.length) {
      this.setData({ poem, layout: 'poem' })
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
    this.setData({ source: e.currentTarget.dataset.key }, () => this.resolveChars())
  },

  pickGrid(e) {
    this.setData({ gridStyle: e.currentTarget.dataset.key })
  },

  pickLayout(e) {
    this.setData({ layout: e.currentTarget.dataset.key })
  },

  pickCell(e) {
    this.setData({ cellCm: e.currentTarget.dataset.key })
  },

  pickTrace(e) {
    this.setData({ traceRows: Number(e.currentTarget.dataset.value) })
  },

  pickTemplate(e) {
    this.setData({ templateIndex: Number(e.currentTarget.dataset.index) }, () => this.resolveChars())
  },

  onCustom(e) {
    this.setData({ customText: e.detail.value })
  },

  resolveChars() {
    const { source, templateIndex, customText } = this.data
    let chars = []
    let poem = this.data.poem
    if (source === 'current') {
      chars = (this.currentList || []).slice()
      if (!chars.length) chars = '永和静学思德谦恒诚'.split('')
    } else if (source === 'favorites') {
      chars = storage.getFavorites().slice()
    } else if (source === 'template') {
      const tpl = templates[templateIndex] || templates[0]
      chars = cnChars(tpl.lines.join(''))
      poem = { title: tpl.name, dynasty: '', author: tpl.desc, lines: tpl.lines }
    } else {
      chars = cnChars(customText)
    }
    chars = cnChars(chars.join(''))
    this.setData({ chars: Array.from(new Set(chars)), poem })
  },

  generate() {
    const { layout, poem } = this.data
    if (layout === 'poem' && poem && poem.lines.length) {
      this.generatePoem()
    } else {
      this.generateGrid()
    }
  },

  buildCanvas(drawFn) {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const maxW = (win.windowWidth || 375) - 40
    const scale = Math.min(1, maxW / PAGE_W)
    this.setData(
      { canvasW: Math.floor(PAGE_W * scale), canvasH: Math.floor(PAGE_H * scale) },
      () => {
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
            node.width = PAGE_W
            node.height = PAGE_H
            const ctx = node.getContext('2d')
            drawFn(ctx)
            this.canvasNode = node
            this.exportPreview()
          })
      }
    )
  },

  generateGrid() {
    const { chars } = this.data
    if (!chars.length) {
      wx.showToast({ title: '没有可生成的字', icon: 'none' })
      return
    }
    const cell = Math.round(Number(this.data.cellCm) * CM)
    const cols = Math.max(1, Math.floor((PAGE_W - 2 * SIDE) / cell))
    const rows = Math.max(1, Math.floor((PAGE_H - HEADER - FOOTER) / cell))
    const startX = Math.round((PAGE_W - cols * cell) / 2)
    this.buildCanvas((ctx) => this.drawGridSheet(ctx, chars, cols, rows, cell, startX))
  },

  generatePoem() {
    const lines = this.data.poem.lines.map(cnChars).filter((l) => l.length)
    if (!lines.length) {
      wx.showToast({ title: '没有可生成的诗句', icon: 'none' })
      return
    }
    const maxLen = Math.max.apply(null, lines.map((l) => l.length))
    let cell = Math.round(Number(this.data.cellCm) * CM)
    const maxCell = Math.floor((PAGE_W - 2 * SIDE) / maxLen)
    if (cell > maxCell) cell = maxCell
    const blockRows = 1 + this.data.traceRows
    this.buildCanvas((ctx) => this.drawPoemSheet(ctx, lines, cell, blockRows))
  },

  pxFont(px, serif) {
    return px + 'px ' + (serif ? '"Songti SC", serif' : 'sans-serif')
  },

  drawHeader(ctx, title, subtitle) {
    ctx.fillStyle = '#fdfbf5'
    ctx.fillRect(0, 0, PAGE_W, PAGE_H)
    ctx.fillStyle = '#2b2b2b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = this.pxFont(Math.round(1.0 * CM), true)
    ctx.fillText(title, PAGE_W / 2, Math.round(1.3 * CM))
    if (subtitle) {
      ctx.fillStyle = '#8a8578'
      ctx.font = this.pxFont(Math.round(0.5 * CM), false)
      ctx.fillText(subtitle, PAGE_W / 2, Math.round(2.1 * CM))
    }
  },

  drawFooter(ctx) {
    ctx.fillStyle = '#8a8578'
    ctx.font = this.pxFont(Math.round(0.45 * CM), false)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('墨学 · A4 打印请选「实际大小 / 100%」', PAGE_W / 2, PAGE_H - Math.round(0.9 * CM))
  },

  drawChar(ctx, char, x, y, cell, color) {
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = this.pxFont(Math.floor(cell * 0.72), true)
    ctx.fillText(char, x + cell / 2, y + cell / 2)
  },

  drawGridSheet(ctx, chars, cols, rows, cell, startX) {
    const gridStyle = this.data.gridStyle
    this.drawHeader(ctx, '汉字练习字帖', formatDate())
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = startX + c * cell
        const y = HEADER + r * cell
        this.drawGrid(ctx, x, y, cell, gridStyle)
        const char = chars[(r * cols + c) % chars.length]
        this.drawChar(ctx, char, x, y, cell, r === 0 ? '#2b2b2b' : '#cfc7b4')
      }
    }
    this.drawFooter(ctx)
  },

  drawPoemSheet(ctx, lines, cell, blockRows) {
    const poem = this.data.poem
    const gridStyle = this.data.gridStyle
    const cols = Math.max.apply(null, lines.map((l) => l.length))
    const gridW = cols * cell
    const startBase = Math.round((PAGE_W - gridW) / 2)
    const blockH = blockRows * cell + LINE_GAP
    const totalH = lines.length * blockH
    let startY = HEADER + Math.max(0, Math.floor((PAGE_H - HEADER - FOOTER - totalH) / 2))
    const sub = [poem.dynasty, poem.author].filter(Boolean).join(' · ')
    this.drawHeader(ctx, poem.title || '古诗字帖', sub || formatDate())

    lines.forEach((lineChars, i) => {
      const y0 = startY + i * blockH
      const startX = startBase + Math.round(((cols - lineChars.length) / 2) * cell)
      for (let row = 0; row < blockRows; row += 1) {
        const y = y0 + row * cell
        const color = row === 0 ? '#2b2b2b' : '#cfc7b4'
        for (let j = 0; j < lineChars.length; j += 1) {
          const x = startX + j * cell
          this.drawGrid(ctx, x, y, cell, gridStyle)
          this.drawChar(ctx, lineChars[j], x, y, cell, color)
        }
      }
    })
    this.drawFooter(ctx)
  },

  drawGrid(ctx, x, y, size, style) {
    const gridColor = 'rgba(178,58,51,0.55)'
    const subColor = 'rgba(178,58,51,0.3)'
    ctx.save()
    ctx.lineWidth = 2
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

    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)

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
