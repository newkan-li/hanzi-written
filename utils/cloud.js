/**
 * 微信云开发数据同步（可选）
 * 仅当 config.cloud.enabled && env && sync 且 wx.cloud 可用时生效；
 * 集合权限建议设为「仅创建者可读写」，则每个用户只读写自己的数据。
 */
const config = require('./config')
const storage = require('./storage')

function ready() {
  const c = config.cloud || {}
  return !!(c.enabled && c.env && c.sync && wx.cloud)
}

function coll() {
  return wx.cloud.database().collection('hw_data')
}

function pull() {
  if (!ready()) return Promise.resolve(null)
  return coll()
    .where({})
    .limit(1)
    .get()
    .then((res) => (res.data && res.data[0]) || null)
    .catch(() => null)
}

function push() {
  if (!ready()) return Promise.resolve(false)
  const data = storage.exportAll()
  const now = Date.now()
  return coll()
    .where({})
    .limit(1)
    .get()
    .then((res) => {
      const doc = res.data && res.data[0]
      const payload = Object.assign({ updatedAt: now }, data)
      if (doc) return coll().doc(doc._id).update({ data: payload })
      return coll().add({ data: Object.assign({ createdAt: now }, payload) })
    })
    .then(() => true)
    .catch(() => false)
}

// 拉取 → 合并 → 写回本地 → 回推
function sync() {
  if (!ready()) return Promise.resolve({ ok: false, reason: 'disabled' })
  return pull()
    .then((remote) => {
      const merged = storage.mergeAll(storage.exportAll(), remote)
      storage.importAll(merged)
      return push().then(() => ({ ok: true }))
    })
    .catch((e) => ({ ok: false, reason: (e && e.errMsg) || 'error' }))
}

module.exports = { ready, pull, push, sync }
