const storage = require('../../utils/storage')
const { charInfo } = require('../../data/charInfo')

const W = 600
const H = 800

Page({
  data: {
    char: '永',
    canvasW: 0,
    canvasH: 0,
    preview: '',
    generated: false
  },

  onLoad() {
    const char = getApp().globalData.posterChar || '永'
    this.setData({ char })
  },

  onReady() {
    this.generate()
  },

  generate() {
    const char = this.data.char
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const maxW = (win.windowWidth || 375) - 60
    const scale = Math.min(1, maxW / W)
    const displayW = Math.floor(W * scale)
    const displayH = Math.floor(H * scale)

    this.setData({ canvasW: displayW, canvasH: displayH }, () => {
      wx.createSelectorQuery()
        .select('#poster-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const info = res && res[0]
          if (!info || !info.node) {
            wx.showToast({ title: '画布初始化失败', icon: 'none' })
            return
          }
          const node = info.node
          const dpr = win.pixelRatio || 2
          node.width = W * dpr
          node.height = H * dpr
          const ctx = node.getContext('2d')
          ctx.scale(dpr, dpr)
          this.draw(ctx, char)
          this.canvasNode = node
          this.exportPreview()
        })
    })
  },

  draw(ctx, char) {
    const stats = storage.getStats()
    const dict = charInfo[char] || {}

    ctx.fillStyle = '#f7f4ec'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#e0d8c4'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 16, W - 32, H - 32)

    ctx.fillStyle = '#2b2b2b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '40px "Songti SC", serif'
    ctx.fillText('墨学', W / 2, 90)
    ctx.fillStyle = '#8a8578'
    ctx.font = '20px sans-serif'
    ctx.fillText('跟着笔顺，写好每一个汉字', W / 2, 130)

    // 田字格 + 大字
    const size = 300
    const gx = (W - size) / 2
    const gy = 200
    ctx.strokeStyle = 'rgba(178,58,51,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(gx, gy, size, size)
    ctx.beginPath()
    ctx.moveTo(gx + size / 2, gy)
    ctx.lineTo(gx + size / 2, gy + size)
    ctx.moveTo(gx, gy + size / 2)
    ctx.lineTo(gx + size, gy + size / 2)
    ctx.stroke()

    ctx.fillStyle = '#2b2b2b'
    ctx.font = `${Math.floor(size * 0.72)}px "Songti SC", serif`
    ctx.fillText(char, W / 2, gy + size / 2 + 6)

    ctx.fillStyle = '#b23a33'
    ctx.font = '34px sans-serif'
    ctx.fillText(dict.pinyin || '', W / 2, gy + size + 60)

    ctx.fillStyle = '#8a8578'
    ctx.font = '24px sans-serif'
    ctx.fillText(
      `已连续打卡 ${stats.streak} 天 · 已练 ${stats.charCount} 字`,
      W / 2,
      gy + size + 120
    )

    ctx.fillStyle = '#b23b33'
    ctx.font = '22px sans-serif'
    ctx.fillText('长按保存 / 扫码一起练字', W / 2, H - 70)
  },

  exportPreview() {
    wx.canvasToTempFilePath({
      canvas: this.canvasNode,
      fileType: 'png',
      success: (res) => this.setData({ preview: res.tempFilePath, generated: true }),
      fail: () => wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },

  saveToAlbum() {
    if (!this.data.preview) return
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
    if (!this.data.preview) return
    wx.showShareImageMenu({
      path: this.data.preview,
      fail: () => wx.showToast({ title: '当前环境不支持分享', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return {
      title: `我在墨学练「${this.data.char}」字`,
      path: '/pages/index/index'
    }
  }
})
