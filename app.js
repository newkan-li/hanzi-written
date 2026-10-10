App({
  globalData: {
    practiceList: [],
    practiceIndex: 0
  },

  onLaunch() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.globalData.windowWidth = info.windowWidth

    // 微信云开发（可选）
    const cloud = require('./utils/config').cloud || {}
    if (cloud.enabled && cloud.env && wx.cloud) {
      try {
        wx.cloud.init({ env: cloud.env, traceUser: true })
      } catch (e) {
        /* 忽略 */
      }
    }

    // 新版基础库暴露了全局 Path2D，但小程序里 new Path2D(pathString) 不被支持，
    // 会让 hanzi-writer 用空路径做 clip 而画不出字（静默空白）。
    // 这里把它置空，使 hanzi-writer 走微信兼容的绘制分支。
    try {
      if (typeof globalThis !== 'undefined' && globalThis.Path2D) {
        globalThis.Path2D = undefined
      }
      if (typeof global !== 'undefined' && global.Path2D) {
        global.Path2D = undefined
      }
    } catch (e) {
      /* 忽略 */
    }
  }
})
