const storage = require('../../utils/storage')
const config = require('../../utils/config')
const cloud = require('../../utils/cloud')

Page({
  data: {
    stats: { charCount: 0, totalCount: 0, favCount: 0, weakCount: 0, days: 0, streak: 0 },
    checkin: { streak: 0, totalDays: 0, todayDone: false, recent: [] },
    favorites: [],
    records: [],
    remindOn: false,
    remindTime: '20:00',
    tmplReady: false
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const s = config.subscribe || {}
    this.setData({
      stats: storage.getStats(),
      checkin: storage.getCheckinStats(),
      favorites: storage.getFavorites(),
      records: storage.getRecords().slice(0, 50),
      remindOn: storage.getPref('remindOn', false),
      remindTime: storage.getPref('remindTime', '20:00'),
      tmplReady: !!(s.enabled && s.tmplId),
      cloudReady: cloud.ready()
    })
  },

  onCloudSync() {
    if (!cloud.ready()) {
      wx.showToast({ title: '未开启云同步', icon: 'none' })
      return
    }
    wx.showLoading({ title: '同步中…' })
    cloud.sync().then((r) => {
      wx.hideLoading()
      if (r.ok) {
        wx.showToast({ title: '同步完成', icon: 'success' })
        this.refresh()
      } else {
        wx.showToast({ title: '同步失败', icon: 'none' })
      }
    })
  },

  onTapChar(e) {
    const char = e.currentTarget.dataset.char
    getApp().globalData.practiceList = [char]
    getApp().globalData.practiceIndex = 0
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onPracticeFavorites() {
    const chars = storage.getFavorites().slice()
    if (!chars.length) return
    getApp().globalData.practiceList = chars
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

  onOpenWeak() {
    wx.navigateTo({ url: '/pages/weak/weak' })
  },

  onOpenTraj() {
    wx.navigateTo({ url: '/pages/traj/traj' })
  },

  onOpenHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onOpenAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
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
  },

  toggleRemind() {
    const on = !this.data.remindOn
    if (!on) {
      storage.setPref('remindOn', false)
      this.setData({ remindOn: false })
      syncRemindCol(false, this.data.remindTime)
      return
    }
    const s = config.subscribe || {}
    if (!s.enabled || !s.tmplId) {
      wx.showModal({
        title: '未配置订阅模板',
        content: '请在 utils/config.js 填写 subscribe.tmplId（公众平台「订阅消息」申请），并由服务端在设定时间发送。详见 docs/上线指引.md。',
        showCancel: false
      })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [s.tmplId],
      success: (res) => {
        const ok = res[s.tmplId] === 'accept'
        storage.setPref('remindOn', ok)
        this.setData({ remindOn: ok })
        if (ok) syncRemindCol(true, this.data.remindTime)
        wx.showToast({ title: ok ? '已开启打卡提醒' : '未授权', icon: 'none' })
      },
      fail: () => wx.showToast({ title: '订阅失败', icon: 'none' })
    })
  },

  onRemindTime(e) {
    const remindTime = e.detail.value
    storage.setPref('remindTime', remindTime)
    this.setData({ remindTime })
    if (this.data.remindOn) syncRemindCol(true, remindTime)
  },

  onShareAppMessage() {
    return { title: '墨学 · 学写汉字，坚持每日打卡', path: '/pages/index/index' }
  },

  onShareTimeline() {
    return { title: '墨学 · 学写汉字，坚持每日打卡' }
  }
})

// 打卡提醒同步到云（供云函数定时发送）
function syncRemindCol(on, time) {
  if (!cloud.ready()) return
  const c = wx.cloud.database().collection('remind')
  c.where({})
    .limit(1)
    .get()
    .then((res) => {
      const doc = res.data && res.data[0]
      const data = { on: !!on, time: time || '20:00', updatedAt: Date.now() }
      if (doc) return c.doc(doc._id).update({ data })
      return c.add({ data })
    })
    .catch(() => {
      /* 忽略 */
    })
}
