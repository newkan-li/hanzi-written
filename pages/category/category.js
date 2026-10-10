const { categories } = require('../../data/commonChars')

const PAGE_SIZE = 24

Page({
  data: {
    name: '',
    desc: '',
    chars: [],
    page: 0,
    totalPages: 1,
    totalChars: 0,
    hasPrev: false,
    hasNext: false
  },

  onLoad(options) {
    const key = options.key
    const category = categories.find((c) => c.key === key) || categories[0]
    wx.setNavigationBarTitle({ title: category.name })
    this.allChars = category.chars
    this.setData({
      name: category.name,
      desc: category.desc,
      totalChars: this.allChars.length
    })
    this.setPage(0)
  },

  setPage(p) {
    const totalPages = Math.max(1, Math.ceil(this.allChars.length / PAGE_SIZE))
    const page = Math.min(Math.max(p, 0), totalPages - 1)
    const chars = this.allChars.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    this.setData({
      page,
      totalPages,
      chars,
      hasPrev: page > 0,
      hasNext: page < totalPages - 1
    })
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },

  prev() {
    if (this.data.hasPrev) this.setPage(this.data.page - 1)
  },

  next() {
    if (this.data.hasNext) this.setPage(this.data.page + 1)
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    const index = this.allChars.indexOf(char)
    getApp().globalData.practiceList = this.allChars
    getApp().globalData.practiceIndex = index < 0 ? 0 : index
    wx.navigateTo({ url: '/pages/practice/practice' })
  }
})
