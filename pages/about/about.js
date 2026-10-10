const config = require('../../utils/config')

Page({
  data: {
    name: config.app.name,
    version: config.app.version
  },

  copyContact() {
    wx.setClipboardData({ data: 'your-email@example.com' })
  }
})
