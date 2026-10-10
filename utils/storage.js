/**
 * 本地存储：练习记录、收藏、偏好、每日打卡（零后端）
 */
const FAV_KEY = 'hw_favorites'
const REC_KEY = 'hw_records'
const PREF_KEY = 'hw_prefs'
const CHECKIN_KEY = 'hw_checkins'

/* ---------- 偏好 ---------- */
function getPrefs() {
  return wx.getStorageSync(PREF_KEY) || {}
}

function getPref(key, def) {
  const prefs = getPrefs()
  return prefs[key] !== undefined ? prefs[key] : def
}

function setPref(key, value) {
  const prefs = getPrefs()
  prefs[key] = value
  wx.setStorageSync(PREF_KEY, prefs)
  return prefs
}

/* ---------- 收藏 ---------- */
function getFavorites() {
  return wx.getStorageSync(FAV_KEY) || []
}

function isFavorite(char) {
  return getFavorites().indexOf(char) > -1
}

function toggleFavorite(char) {
  const list = getFavorites()
  const i = list.indexOf(char)
  if (i > -1) {
    list.splice(i, 1)
  } else {
    list.unshift(char)
  }
  wx.setStorageSync(FAV_KEY, list)
  return i === -1
}

function clearFavorites() {
  wx.removeStorageSync(FAV_KEY)
}

/* ---------- 练习记录 ---------- */
function getRecord(char) {
  const records = wx.getStorageSync(REC_KEY) || {}
  return records[char] || { count: 0, lastTime: 0 }
}

function addRecord(char) {
  const records = wx.getStorageSync(REC_KEY) || {}
  const rec = records[char] || { count: 0, lastTime: 0 }
  rec.count += 1
  rec.lastTime = Date.now()
  records[char] = rec
  wx.setStorageSync(REC_KEY, records)
  return rec
}

function getRecords() {
  const records = wx.getStorageSync(REC_KEY) || {}
  return Object.keys(records)
    .map((char) => ({
      char,
      count: records[char].count,
      lastTime: records[char].lastTime
    }))
    .sort((a, b) => b.lastTime - a.lastTime)
}

function clearRecords() {
  wx.removeStorageSync(REC_KEY)
}

/* ---------- 每日打卡 ---------- */
function dateKey(d) {
  const t = d || new Date()
  const m = t.getMonth() + 1
  const day = t.getDate()
  return `${t.getFullYear()}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`
}

function getCheckins() {
  return wx.getStorageSync(CHECKIN_KEY) || {}
}

function checkin() {
  const map = getCheckins()
  const today = dateKey()
  map[today] = (map[today] || 0) + 1
  wx.setStorageSync(CHECKIN_KEY, map)
  return map
}

function getCheckinStats() {
  const map = getCheckins()
  const days = Object.keys(map).sort()
  const today = dateKey()

  // 连续天数：从今天（或昨天）向前数
  let streak = 0
  const cursor = new Date()
  if (!map[dateKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (map[dateKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // 最近 7 天
  const recent = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = dateKey(d)
    recent.push({ date: key, done: !!map[key] })
  }

  return {
    totalDays: days.length,
    streak,
    todayDone: !!map[today],
    recent
  }
}

/* ---------- 汇总 ---------- */
function getStats() {
  const records = wx.getStorageSync(REC_KEY) || {}
  const chars = Object.keys(records)
  const checkinStats = getCheckinStats()
  return {
    charCount: chars.length,
    totalCount: chars.reduce((sum, c) => sum + records[c].count, 0),
    favCount: getFavorites().length,
    days: checkinStats.totalDays,
    streak: checkinStats.streak
  }
}

module.exports = {
  getPref,
  setPref,
  getFavorites,
  isFavorite,
  toggleFavorite,
  clearFavorites,
  getRecord,
  addRecord,
  getRecords,
  clearRecords,
  checkin,
  getCheckinStats,
  getStats
}
