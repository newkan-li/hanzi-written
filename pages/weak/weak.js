const storage = require('../../utils/storage')

Page({
  data: {
    list: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = storage.getWeak()
    this.setData({
      list: list.map((it) => ({ char: it.char, count: it.count }))
    })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onRemove(e) {
    const char = e.currentTarget.dataset.char
    storage.removeWeak(char)
    this.refresh()
  },

  onPracticeAll() {
    const chars = this.data.list.map((it) => it.char)
    if (!chars.length) return
    getApp().globalData.practiceList = chars
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onClear() {
    wx.showModal({
      title: '清空生字本',
      content: '确定要清空生字本吗？',
      success: (res) => {
        if (!res.confirm) return
        storage.clearWeak()
        this.refresh()
      }
    })
  }
})
