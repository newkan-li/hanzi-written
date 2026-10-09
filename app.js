App({
  globalData: {
    practiceList: [],
    practiceIndex: 0
  },

  onLaunch() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.globalData.windowWidth = info.windowWidth
  }
})
