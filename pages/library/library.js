const { categories } = require('../../data/commonChars')

Page({
  data: {
    categories
  },

  onOpenCategory(e) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: `/pages/category/category?key=${key}` })
  },

  onOpenWorksheet() {
    getApp().globalData.worksheetList = categories[0].chars
    wx.navigateTo({ url: '/pages/worksheet/worksheet' })
  },

  onOpenIdiom() {
    wx.navigateTo({ url: '/pages/idiom/idiom' })
  },

  onOpenTextbook() {
    wx.navigateTo({ url: '/packages/textbook/pages/textbook/textbook' })
  }
})
