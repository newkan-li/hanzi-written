const { categories, dailyPool } = require('../../data/commonChars')

function pickDaily() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const day = Math.floor((Date.now() - start.getTime()) / 86400000)
  return dailyPool[day % dailyPool.length]
}

Page({
  data: {
    daily: '',
    query: '',
    categories
  },

  onLoad() {
    this.setData({ daily: pickDaily() })
  },

  onInput(e) {
    this.setData({ query: e.detail.value })
  },

  onPracticeDaily() {
    this.openPractice([this.data.daily], 0)
  },

  onSearch() {
    const chars = this.data.query
      .split('')
      .filter((c) => /[\u4e00-\u9fa5]/.test(c))
    if (!chars.length) {
      wx.showToast({ title: '请输入汉字', icon: 'none' })
      return
    }
    this.openPractice(chars, 0)
  },

  onOpenCategory(e) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: `/pages/category/category?key=${key}` })
  },

  onWorksheet() {
    getApp().globalData.worksheetList = categories[0].chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  onPoster() {
    getApp().globalData.posterChar = this.data.daily
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  onIdiom() {
    wx.navigateTo({ url: '/pages/idiom/idiom' })
  },

  onTapChar(e) {
    const { char, chars } = e.currentTarget.dataset
    this.openPractice(chars || [char], (chars || [char]).indexOf(char))
  },

  openPractice(list, index) {
    getApp().globalData.practiceList = list
    getApp().globalData.practiceIndex = index || 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  }
})
