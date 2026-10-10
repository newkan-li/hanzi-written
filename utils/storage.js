/**
 * 本地存储：练习记录、收藏、偏好、每日打卡（零后端）
 */
const FAV_KEY = 'hw_favorites'
const REC_KEY = 'hw_records'
const PREF_KEY = 'hw_prefs'
const CHECKIN_KEY = 'hw_checkins'
const WEAK_KEY = 'hw_weak'
const TRAJ_KEY = 'hw_trajectory'
const DAILY_KEY = 'hw_daily'

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

/* ---------- 生字本 / 错字本（带 SRS 间隔复习） ---------- */
// 复习间隔（天）：答对逐级升档，答错回到 0 级（当天再练）
const SRS_DAYS = [0, 1, 2, 4, 7, 15, 30]

function shiftDate(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

function getWeak() {
  const map = wx.getStorageSync(WEAK_KEY) || {}
  const today = dateKey()
  return Object.keys(map)
    .map((char) => {
      const rec = map[char]
      const nextDue = rec.nextDue || ''
      return {
        char,
        count: rec.count,
        lastTime: rec.lastTime,
        level: rec.level || 0,
        nextDue,
        due: !nextDue || nextDue <= today
      }
    })
    .sort((a, b) => (a.nextDue || '').localeCompare(b.nextDue || '') || b.lastTime - a.lastTime)
}

function getDueWeak() {
  return getWeak().filter((it) => it.due)
}

function isWeak(char) {
  const map = wx.getStorageSync(WEAK_KEY) || {}
  return !!map[char]
}

function addWeak(char) {
  const map = wx.getStorageSync(WEAK_KEY) || {}
  const rec = map[char] || { count: 0, lastTime: 0, level: 0, nextDue: '' }
  rec.count += 1
  rec.lastTime = Date.now()
  rec.level = 0
  rec.nextDue = dateKey()
  map[char] = rec
  wx.setStorageSync(WEAK_KEY, map)
  return rec
}

// 复习通过（答对/完成）→ 升档，安排下次复习
function reviewWeak(char) {
  const map = wx.getStorageSync(WEAK_KEY) || {}
  const rec = map[char]
  if (!rec) return
  rec.level = Math.min((rec.level || 0) + 1, SRS_DAYS.length - 1)
  rec.nextDue = shiftDate(SRS_DAYS[rec.level])
  map[char] = rec
  wx.setStorageSync(WEAK_KEY, map)
}

function removeWeak(char) {
  const map = wx.getStorageSync(WEAK_KEY) || {}
  if (map[char]) {
    delete map[char]
    wx.setStorageSync(WEAK_KEY, map)
  }
}

function clearWeak() {
  wx.removeStorageSync(WEAK_KEY)
}

/* ---------- 练习轨迹 ---------- */
function getTrajectory() {
  return wx.getStorageSync(TRAJ_KEY) || []
}

function addTrajectory(item) {
  return new Promise((resolve) => {
    const list = getTrajectory()
    const id = 't' + Date.now()
    const fs = wx.getFileSystemManager()
    const dest = `${wx.env.USER_DATA_PATH}/hw_traj_${id}.png`
    fs.copyFile({
      srcPath: item.path,
      destPath: dest,
      success: () => {
        list.unshift({ id, char: item.char || '', time: Date.now(), path: dest })
        // 最多保留 100 张，超出删除旧文件
        while (list.length > 100) {
          const rm = list.pop()
          try {
            fs.unlink({ filePath: rm.path })
          } catch (e) {
            /* 忽略 */
          }
        }
        wx.setStorageSync(TRAJ_KEY, list)
        resolve(list)
      },
      fail: () => resolve(list)
    })
  })
}

function removeTrajectory(id) {
  const list = getTrajectory()
  const idx = list.findIndex((it) => it.id === id)
  if (idx > -1) {
    const rm = list[idx]
    const fs = wx.getFileSystemManager()
    try {
      fs.unlink({ filePath: rm.path })
    } catch (e) {
      /* 忽略 */
    }
    list.splice(idx, 1)
    wx.setStorageSync(TRAJ_KEY, list)
  }
  return list
}

function clearTrajectory() {
  const list = getTrajectory()
  const fs = wx.getFileSystemManager()
  list.forEach((it) => {
    try {
      fs.unlink({ filePath: it.path })
    } catch (e) {
      /* 忽略 */
    }
  })
  wx.removeStorageSync(TRAJ_KEY)
}

/* ---------- 学习记录（按天） ---------- */
function addDailyPractice(char) {
  const map = wx.getStorageSync(DAILY_KEY) || {}
  const today = dateKey()
  const d = map[today] || { count: 0, chars: {} }
  d.count += 1
  if (char) d.chars[char] = (d.chars[char] || 0) + 1
  map[today] = d
  // 只保留最近 180 天
  const keys = Object.keys(map).sort()
  while (keys.length > 180) {
    delete map[keys.shift()]
  }
  wx.setStorageSync(DAILY_KEY, map)
  return d
}

function getDailyLog(limit) {
  const map = wx.getStorageSync(DAILY_KEY) || {}
  return Object.keys(map)
    .sort()
    .reverse()
    .slice(0, limit || 60)
    .map((date) => ({
      date,
      count: map[date].count,
      chars: Object.keys(map[date].chars || {})
    }))
}

function clearDaily() {
  wx.removeStorageSync(DAILY_KEY)
}

/* ---------- 导入/导出（用于云同步） ---------- */
function exportAll() {
  return {
    favorites: wx.getStorageSync(FAV_KEY) || [],
    records: wx.getStorageSync(REC_KEY) || {},
    weak: wx.getStorageSync(WEAK_KEY) || {},
    daily: wx.getStorageSync(DAILY_KEY) || {},
    prefs: wx.getStorageSync(PREF_KEY) || {}
  }
}

function importAll(d) {
  if (!d) return
  if (d.favorites) wx.setStorageSync(FAV_KEY, d.favorites)
  if (d.records) wx.setStorageSync(REC_KEY, d.records)
  if (d.weak) wx.setStorageSync(WEAK_KEY, d.weak)
  if (d.daily) wx.setStorageSync(DAILY_KEY, d.daily)
  if (d.prefs) wx.setStorageSync(PREF_KEY, d.prefs)
}

function earlierDue(a, b) {
  if (!a) return b || ''
  if (!b) return a
  return a < b ? a : b
}

function mergeAll(local, remote) {
  const a = local || exportAll()
  if (!remote) return a
  const favorites = Array.from(new Set([].concat(a.favorites || [], remote.favorites || [])))
  const mergeMap = (x, y, mk) => {
    const out = {}
    Object.keys(x || {}).forEach((k) => {
      out[k] = Object.assign({}, x[k])
    })
    Object.keys(y || {}).forEach((k) => {
      out[k] = out[k] ? mk(out[k], y[k]) : Object.assign({}, y[k])
    })
    return out
  }
  const records = mergeMap(a.records, remote.records, (p, q) => ({
    count: Math.max(p.count || 0, q.count || 0),
    lastTime: Math.max(p.lastTime || 0, q.lastTime || 0)
  }))
  const weak = mergeMap(a.weak, remote.weak, (p, q) => ({
    count: Math.max(p.count || 0, q.count || 0),
    lastTime: Math.max(p.lastTime || 0, q.lastTime || 0),
    level: Math.max(p.level || 0, q.level || 0),
    nextDue: earlierDue(p.nextDue, q.nextDue)
  }))
  const daily = mergeMap(a.daily, remote.daily, (p, q) => {
    const chars = Object.assign({}, p.chars || {})
    Object.keys(q.chars || {}).forEach((c) => {
      chars[c] = Math.max(chars[c] || 0, q.chars[c] || 0)
    })
    return { count: Math.max(p.count || 0, q.count || 0), chars }
  })
  const prefs = Object.assign({}, remote.prefs || {}, a.prefs || {})
  return { favorites, records, weak, daily, prefs }
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
    weakCount: Object.keys(wx.getStorageSync(WEAK_KEY) || {}).length,
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
  getWeak,
  addWeak,
  reviewWeak,
  getDueWeak,
  isWeak,
  removeWeak,
  clearWeak,
  getTrajectory,
  addTrajectory,
  removeTrajectory,
  clearTrajectory,
  addDailyPractice,
  getDailyLog,
  clearDaily,
  exportAll,
  importAll,
  mergeAll,
  getStats
}
