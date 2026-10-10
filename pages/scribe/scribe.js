const storage = require('../../utils/storage')

const COLORS = [
  { key: '#2b2b2b', name: '墨黑' },
  { key: '#b23a33', name: '朱红' },
  { key: '#2f5d8a', name: '靛蓝' }
]
const WIDTHS = [6, 10, 16]

Page({
  data: {
    size: 320,
    grid: true,
    showGuide: true,
    guideChar: '',
    colors: COLORS,
    color: '#2b2b2b',
    widths: WIDTHS,
    width: 10,
    canUndo: false
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const size = Math.floor((info.windowWidth || 375) * 0.86)
    const app = getApp()
    const guide = (app.globalData.scribeChar || '').slice(0, 1)
    app.globalData.scribeChar = ''
    this.strokes = []
    this.cur = null
    this.setData({ size, guideChar: guide })
  },

  onReady() {
    const S = this.data.size
    wx.createSelectorQuery()
      .select('#scribe-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) return
        const node = info.node
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const dpr = win.pixelRatio || 2
        node.width = S * dpr
        node.height = S * dpr
        this.canvasNode = node
        this.ctx = node.getContext('2d')
        this.ctx.scale(dpr, dpr)
        this.drawAll()
      })
  },

  pt(e) {
    const t = e.touches && e.touches[0]
    if (!t) return { x: 0, y: 0 }
    if (typeof t.x === 'number') return { x: t.x, y: t.y }
    return { x: t.clientX, y: t.clientY }
  },

  onStart(e) {
    const p = this.pt(e)
    this.cur = { color: this.data.color, width: this.data.width, points: [p] }
    this.strokes.push(this.cur)
    this.drawAll()
  },

  onMove(e) {
    if (!this.cur) return
    const p = this.pt(e)
    const last = this.cur.points[this.cur.points.length - 1]
    if (last && Math.abs(last.x - p.x) < 1 && Math.abs(last.y - p.y) < 1) return
    this.cur.points.push(p)
    this.drawAll()
    if (!this.data.canUndo) this.setData({ canUndo: true })
  },

  onEnd() {
    this.cur = null
  },

  drawAll() {
    const ctx = this.ctx
    if (!ctx) return
    const S = this.data.size
    ctx.clearRect(0, 0, S, S)
    if (this.data.grid) this.drawGrid(ctx, S)
    if (this.data.showGuide && this.data.guideChar) this.drawGuide(ctx, S)
    this.strokes.forEach((st) => this.drawStroke(ctx, st))
  },

  drawGrid(ctx, S) {
    ctx.save()
    ctx.strokeStyle = 'rgba(178,58,51,0.35)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1)
    ctx.strokeStyle = 'rgba(178,58,51,0.2)'
    ctx.beginPath()
    ctx.moveTo(S / 2, 0)
    ctx.lineTo(S / 2, S)
    ctx.moveTo(0, S / 2)
    ctx.lineTo(S, S / 2)
    ctx.moveTo(0, 0)
    ctx.lineTo(S, S)
    ctx.moveTo(S, 0)
    ctx.lineTo(0, S)
    ctx.stroke()
    ctx.restore()
  },

  drawGuide(ctx, S) {
    ctx.save()
    ctx.fillStyle = 'rgba(43,43,43,0.12)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${Math.floor(S * 0.7)}px "Songti SC", serif`
    ctx.fillText(this.data.guideChar, S / 2, S / 2 + S * 0.03)
    ctx.restore()
  },

  drawStroke(ctx, st) {
    if (!st.points.length) return
    ctx.save()
    ctx.beginPath()
    ctx.lineWidth = st.width
    ctx.strokeStyle = st.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    st.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    if (st.points.length === 1) ctx.lineTo(st.points[0].x + 0.1, st.points[0].y + 0.1)
    ctx.stroke()
    ctx.restore()
  },

  undo() {
    if (!this.strokes.length) return
    this.strokes.pop()
    this.setData({ canUndo: this.strokes.length > 0 })
    this.drawAll()
  },

  clear() {
    wx.showModal({
      title: '清空画板',
      content: '确定要清空当前书写吗？',
      success: (res) => {
        if (!res.confirm) return
        this.strokes = []
        this.setData({ canUndo: false })
        this.drawAll()
      }
    })
  },

  toggleGrid() {
    this.setData({ grid: !this.data.grid }, () => this.drawAll())
  },

  toggleGuide() {
    this.setData({ showGuide: !this.data.showGuide }, () => this.drawAll())
  },

  onGuideInput(e) {
    const guideChar = (e.detail.value || '').slice(0, 1)
    this.setData({ guideChar }, () => this.drawAll())
  },

  pickColor(e) {
    this.setData({ color: e.currentTarget.dataset.key })
  },

  pickWidth(e) {
    this.setData({ width: Number(e.currentTarget.dataset.value) })
  },

  exportImage() {
    return new Promise((resolve) => {
      wx.canvasToTempFilePath({
        canvas: this.canvasNode,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve('')
      })
    })
  },

  async saveImage() {
    const path = await this.exportImage()
    if (!path) {
      wx.showToast({ title: '导出失败', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: path,
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

  async saveTraj() {
    const path = await this.exportImage()
    if (!path) {
      wx.showToast({ title: '导出失败', icon: 'none' })
      return
    }
    await storage.addTrajectory({ char: this.data.guideChar, path })
    wx.showToast({ title: '已加入练习轨迹' })
  }
})
