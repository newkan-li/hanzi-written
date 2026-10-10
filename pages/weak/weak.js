const storage = require('../../utils/storage')

Page({
  data: {
    list: [],
    dueCount: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = storage.getWeak()
    this.setData({
      list: list.map((it) => ({
        char: it.char,
        count: it.count,
        level: it.level,
        due: it.due,
        nextDue: it.nextDue
      })),
      dueCount: list.filter((it) => it.due).length
    })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onPracticeDue() {
    const chars = storage.getDueWeak().map((it) => it.char)
    if (!chars.length) {
      wx.showToast({ title: '今天没有待复习的字', icon: 'none' })
      return
    }
    getApp().globalData.practiceList = chars
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
