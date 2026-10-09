const { categories } = require('../../data/commonChars')

Page({
  data: {
    name: '',
    desc: '',
    chars: []
  },

  onLoad(options) {
    const key = options.key
    const category = categories.find((c) => c.key === key) || categories[0]
    wx.setNavigationBarTitle({ title: category.name })
    this.setData({
      name: category.name,
      desc: category.desc,
      chars: category.chars
    })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    const index = this.data.chars.indexOf(char)
    getApp().globalData.practiceList = this.data.chars
    getApp().globalData.practiceIndex = index
    wx.navigateTo({ url: '/pages/practice/practice' })
  }
})
