const storage = require('../../utils/storage')

function fmt(t) {
  const d = new Date(t)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`
}

Page({
  data: {
    list: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = storage.getTrajectory().map((it) => ({
      id: it.id,
      char: it.char,
      path: it.path,
      timeText: fmt(it.time)
    }))
    this.setData({ list })
  },

  onPreview(e) {
    const path = e.currentTarget.dataset.path
    wx.previewImage({
      urls: this.data.list.map((it) => it.path),
      current: path
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    storage.removeTrajectory(id)
    this.refresh()
  },

  onClear() {
    wx.showModal({
      title: '清空练习轨迹',
      content: '确定要清空所有练习轨迹吗？',
      success: (res) => {
        if (!res.confirm) return
        storage.clearTrajectory()
        this.refresh()
      }
    })
  },

  goScribe() {
    wx.navigateTo({ url: '/pages/scribe/scribe' })
  }
})
