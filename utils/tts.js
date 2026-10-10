/**
 * 朗读：多音源自动降级，尽量可用。
 * 配置见 utils/config.js 的 tts.sources（数组，元素为 (text)=>url 或 url 字符串）。
 * 返回控制器 { destroy() }，页面卸载时销毁。
 */
const config = require('./config')

function speak(text, onFail) {
  const cfg = config.tts || {}
  const sources = cfg.sources || (cfg.url ? [cfg.url] : [])
  if (!cfg.enabled || !sources.length) {
    if (onFail) onFail()
    return { destroy() {} }
  }
  let idx = 0
  let audio = null
  let destroyed = false

  const next = () => {
    if (destroyed) return
    if (audio) {
      try {
        audio.destroy()
      } catch (e) {
        /* 忽略 */
      }
      audio = null
    }
    if (idx >= sources.length) {
      if (onFail) onFail()
      return
    }
    const s = sources[idx]
    idx += 1
    audio = wx.createInnerAudioContext()
    try {
      audio.src = typeof s === 'function' ? s(text) : s
    } catch (e) {
      next()
      return
    }
    audio.onError(() => next())
    audio.play()
  }

  next()

  return {
    destroy() {
      destroyed = true
      if (audio) {
        try {
          audio.destroy()
        } catch (e) {
          /* 忽略 */
        }
        audio = null
      }
    }
  }
}

module.exports = { speak }
