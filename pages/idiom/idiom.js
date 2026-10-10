const { idioms } = require('../../data/idioms')

Page({
  data: {
    idioms,
    list: idioms,
    keyword: ''
  },

  onInput(e) {
    const keyword = e.detail.value.trim()
    const list = keyword
      ? idioms.filter((it) => it.word.indexOf(keyword) > -1)
      : idioms
    this.setData({ keyword, list })
  },

  onTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    const it = this.data.list[index]
    if (!it) return
    const chars = it.word.split('')
    const app = getApp()
    app.globalData.practiceList = chars
    app.globalData.practiceIndex = 0
    app.globalData.practiceNote = {
      title: it.word,
      desc: `${it.pinyin} · ${it.meaning}`
    }
    wx.navigateTo({ url: '/pages/practice/practice' })
  }
})
