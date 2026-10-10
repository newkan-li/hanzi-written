const storage = require('../../utils/storage')

Page({
  data: {
    stats: { charCount: 0, totalCount: 0, favCount: 0, days: 0, streak: 0 },
    checkin: { streak: 0, totalDays: 0, todayDone: false, recent: [] },
    favorites: [],
    records: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData({
      stats: storage.getStats(),
      checkin: storage.getCheckinStats(),
      favorites: storage.getFavorites(),
      records: storage.getRecords().slice(0, 50)
    })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onMakePoster() {
    const records = storage.getRecords()
    const char = (this.data.favorites[0] || (records[0] && records[0].char) || '永')
    getApp().globalData.posterChar = char
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  onMakeWorksheet() {
    getApp().globalData.worksheetList = storage.getFavorites()
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  onClearRecords() {
    wx.showModal({
      title: '清空练习记录',
      content: '确定要清空所有练习记录吗？',
      success: (res) => {
        if (!res.confirm) return
        storage.clearRecords()
        this.refresh()
      }
    })
  },

  onClearFavorites() {
    wx.showModal({
      title: '清空收藏',
      content: '确定要清空所有收藏吗？',
      success: (res) => {
        if (!res.confirm) return
        storage.clearFavorites()
        this.refresh()
      }
    })
  }
})
