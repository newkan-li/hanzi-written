const storage = require('../../utils/storage')

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function keyOf(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function label(dateStr) {
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (dateStr === keyOf(today)) return '今天'
  if (dateStr === keyOf(yest)) return '昨天'
  const parts = dateStr.split('-')
  return `${Number(parts[1])}月${Number(parts[2])}日`
}

Page({
  data: {
    log: [],
    stats: { charCount: 0, totalCount: 0, favCount: 0, weakCount: 0, days: 0, streak: 0 }
  },

  onShow() {
    const log = storage.getDailyLog(60).map((it) => ({
      date: it.date,
      label: label(it.date),
      count: it.count,
      chars: it.chars
    }))
    this.setData({ log, stats: storage.getStats() })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onClear() {
    wx.showModal({
      title: '清空学习记录',
      content: '确定要清空按天的学习记录吗？（不影响收藏与生字本）',
      success: (res) => {
        if (!res.confirm) return
        storage.clearDaily()
        this.onShow()
      }
    })
  },

  onShareAppMessage() {
    return { title: '墨学 · 我的学习记录', path: '/pages/index/index' }
  },

  onShareTimeline() {
    return { title: '墨学 · 我的学习记录' }
  }
})
