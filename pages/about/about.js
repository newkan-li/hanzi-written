const config = require('../../utils/config')

Page({
  data: {
    name: config.app.name,
    version: config.app.version,
    testing: false
  },

  copyContact() {
    wx.setClipboardData({ data: 'your-email@example.com' })
  },

  testCharData() {
    if (this.data.testing) return
    const char = '永'
    const url = config.charDataCDN + '/' + encodeURIComponent(char) + '.json'
    this.setData({ testing: true })
    wx.showLoading({ title: '检测中…' })
    wx.request({
      url,
      success: (res) => {
        wx.hideLoading()
        this.setData({ testing: false })
        const ok = res.statusCode === 200 && !!res.data
        wx.showModal({
          title: ok ? '字库连通正常 ✓' : '字库异常',
          content: 'HTTP ' + res.statusCode + '\n' + url,
          showCancel: false
        })
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ testing: false })
        wx.showModal({
          title: '字库连接失败',
          content:
            (err.errMsg || '') +
            '\n\n请在开发者工具「详情 → 本地设置」勾选「不校验合法域名」，或到公众平台配置服务器域名。\n\n' +
            url,
          showCancel: false
        })
      }
    })
  }
})
