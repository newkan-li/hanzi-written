/**
 * 练习记录与收藏（本地存储，零后端成本）
 */
const FAV_KEY = 'hw_favorites'
const REC_KEY = 'hw_records'

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

function getStats() {
  const records = wx.getStorageSync(REC_KEY) || {}
  const chars = Object.keys(records)
  return {
    charCount: chars.length,
    totalCount: chars.reduce((sum, c) => sum + records[c].count, 0),
    favCount: getFavorites().length
  }
}

function clearRecords() {
  wx.removeStorageSync(REC_KEY)
}

function clearFavorites() {
  wx.removeStorageSync(FAV_KEY)
}

module.exports = {
  getFavorites,
  isFavorite,
  toggleFavorite,
  getRecord,
  addRecord,
  getRecords,
  getStats,
  clearRecords,
  clearFavorites
}
