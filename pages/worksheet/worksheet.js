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

const ORIENTATIONS = [
  { key: 'portrait', name: 'A4 纵向' },
  { key: 'landscape', name: 'A4 横向' }
]

// 打印尺寸（300dpi，按真实厘米排版）
const CM = 300 / 2.54 // 118.11 px/cm
const A4_W = Math.round(21.0 * CM) // 2480
const A4_H = Math.round(29.7 * CM) // 3508
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

const REPEAT_OPTIONS = [
  { key: 1, name: '不重复' },
  { key: 2, name: '2 遍' },
  { key: 3, name: '3 遍' }
]

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
    orientations: ORIENTATIONS,
    orientation: 'portrait',
    cellOptions: CELL_OPTIONS,
    cellCm: '1.5',
    traceOptions: TRACE_OPTIONS,
    traceRows: 1,
    repeatOptions: REPEAT_OPTIONS,
    repeat: 1,
    footerText: '',
    watermark: false,
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
    this.setData({
      footerText: storage.getPref('worksheetFooter', ''),
      watermark: storage.getPref('worksheetMark', false)
    })
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

  pickOrientation(e) {
    this.setData({ orientation: e.currentTarget.dataset.key })
  },

  pickCell(e) {
    this.setData({ cellCm: e.currentTarget.dataset.key })
  },

  pickTrace(e) {
    this.setData({ traceRows: Number(e.currentTarget.dataset.value) })
  },

  pickRepeat(e) {
    this.setData({ repeat: Number(e.currentTarget.dataset.value) })
  },

  pickTemplate(e) {
    this.setData({ templateIndex: Number(e.currentTarget.dataset.index) }, () => this.resolveChars())
  },

  onCustom(e) {
    this.setData({ customText: e.detail.value })
  },

  onFooterInput(e) {
    const footerText = e.detail.value
    this.setData({ footerText })
    storage.setPref('worksheetFooter', footerText)
  },

  toggleWatermark() {
    const watermark = !this.data.watermark
    this.setData({ watermark })
    storage.setPref('worksheetMark', watermark)
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

  pageSize() {
    return this.data.orientation === 'landscape'
      ? { W: A4_H, H: A4_W }
      : { W: A4_W, H: A4_H }
  },

  generate() {
    const { layout, poem } = this.data
    if (layout === 'poem' && poem && poem.lines.length) {
      this.generatePoem()
    } else {
      this.generateGrid()
    }
  },

  buildCanvas(W, H, drawFn) {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const maxW = (win.windowWidth || 375) - 40
    const scale = Math.min(1, maxW / W)
    this.setData(
      { canvasW: Math.floor(W * scale), canvasH: Math.floor(H * scale) },
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
            node.width = W
            node.height = H
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
    const repeat = Math.max(1, this.data.repeat || 1)
    // 默认每个字只出现一次（范字）；选了“重复遍数”才连排多次（首个为范字，其余描红）
    const seq = []
    const first = []
    chars.forEach((ch) => {
      for (let k = 0; k < repeat; k += 1) {
        seq.push(ch)
        first.push(k === 0)
      }
    })
    const { W, H } = this.pageSize()
    const cell = Math.round(Number(this.data.cellCm) * CM)
    const cols = Math.max(1, Math.floor((W - 2 * SIDE) / cell))
    const rows = Math.max(1, Math.floor((H - HEADER - FOOTER) / cell))
    const startX = Math.round((W - cols * cell) / 2)
    this.buildCanvas(W, H, (ctx) =>
      this.drawGridSheet(ctx, seq, first, cols, rows, cell, startX, W, H)
    )
  },

  generatePoem() {
    const lines = this.data.poem.lines.map(cnChars).filter((l) => l.length)
    if (!lines.length) {
      wx.showToast({ title: '没有可生成的诗句', icon: 'none' })
      return
    }
    const { W, H } = this.pageSize()
    const maxLen = Math.max.apply(null, lines.map((l) => l.length))
    let cell = Math.round(Number(this.data.cellCm) * CM)
    const maxCellW = Math.floor((W - 2 * SIDE) / maxLen)
    const blockRows = 1 + this.data.traceRows
    const maxCellH = Math.floor((H - HEADER - FOOTER) / (lines.length * blockRows))
    const maxCell = Math.min(maxCellW, maxCellH)
    if (cell > maxCell) cell = maxCell
    this.buildCanvas(W, H, (ctx) => this.drawPoemSheet(ctx, lines, cell, blockRows, W, H))
  },

  pxFont(px, serif) {
    return px + 'px ' + (serif ? '"Songti SC", serif' : 'sans-serif')
  },

  drawHeader(ctx, W, H, title, subtitle) {
    ctx.fillStyle = '#fdfbf5'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#2b2b2b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = this.pxFont(Math.round(1.0 * CM), true)
    ctx.fillText(title, W / 2, Math.round(1.3 * CM))
    if (subtitle) {
      ctx.fillStyle = '#8a8578'
      ctx.font = this.pxFont(Math.round(0.5 * CM), false)
      ctx.fillText(subtitle, W / 2, Math.round(2.1 * CM))
    }
  },

  drawFooter(ctx, W, H) {
    const text = this.data.footerText
    // 水印只放在页脚区域，不遮挡书写区
    if (this.data.watermark) {
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.13)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = this.pxFont(Math.round(1.1 * CM), true)
      ctx.fillText((text || '墨学').slice(0, 20), W / 2, H - Math.round(1.45 * CM))
      ctx.restore()
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = text ? '#b23a33' : '#8a8578'
    ctx.font = this.pxFont(Math.round(0.45 * CM), false)
    ctx.fillText(text || '墨学 · A4 打印请选「实际大小 / 100%」', W / 2, H - Math.round(0.7 * CM))
  },

  drawChar(ctx, char, x, y, cell, color) {
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = this.pxFont(Math.floor(cell * 0.72), true)
    ctx.fillText(char, x + cell / 2, y + cell / 2)
  },

  drawGridSheet(ctx, seq, first, cols, rows, cell, startX, W, H) {
    const gridStyle = this.data.gridStyle
    this.drawHeader(ctx, W, H, '汉字练习字帖', formatDate())
    const total = rows * cols
    for (let k = 0; k < total && k < seq.length; k += 1) {
      const r = Math.floor(k / cols)
      const c = k % cols
      const x = startX + c * cell
      const y = HEADER + r * cell
      this.drawGrid(ctx, x, y, cell, gridStyle)
      this.drawChar(ctx, seq[k], x, y, cell, first[k] ? '#2b2b2b' : '#cfc7b4')
    }
    this.drawFooter(ctx, W, H)
  },

  drawPoemSheet(ctx, lines, cell, blockRows, W, H) {
    const poem = this.data.poem
    const gridStyle = this.data.gridStyle
    const cols = Math.max.apply(null, lines.map((l) => l.length))
    const gridW = cols * cell
    const startBase = Math.round((W - gridW) / 2)
    const blockH = blockRows * cell + LINE_GAP
    const totalH = lines.length * blockH
    const startY = HEADER + Math.max(0, Math.floor((H - HEADER - FOOTER - totalH) / 2))
    const sub = [poem.dynasty, poem.author].filter(Boolean).join(' · ')
    this.drawHeader(ctx, W, H, poem.title || '古诗字帖', sub || formatDate())

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
    this.drawFooter(ctx, W, H)
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
