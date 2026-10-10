/**
 * 字库数据加载：内存缓存 -> 内置字库 -> 本地文件缓存 -> CDN 下载
 * 采用「小字库内置 + 大库按需缓存」策略，既控制包体又能离线。
 */
const config = require('./config')

const memoryCache = {}

function cacheDir() {
  return `${wx.env.USER_DATA_PATH}/char-data`
}

function cachePath(char) {
  return `${cacheDir()}/${char}.json`
}

function readLocal(char) {
  return new Promise((resolve) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: cachePath(char),
      encoding: 'utf8',
      success: (res) => {
        try {
          resolve(JSON.parse(res.data))
        } catch (e) {
          resolve(null)
        }
      },
      fail: () => resolve(null)
    })
  })
}

function writeLocal(char, data) {
  return new Promise((resolve) => {
    const fs = wx.getFileSystemManager()
    try {
      fs.accessSync(cacheDir())
    } catch (e) {
      try {
        fs.mkdirSync(cacheDir(), true)
      } catch (err) {
        /* 目录已存在 */
      }
    }
    fs.writeFile({
      filePath: cachePath(char),
      data: JSON.stringify(data),
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

function fetchRemote(char) {
  const cloud = config.cloud || {}
  // 优先：云开发存储（免域名白名单）
  if (cloud.enabled && cloud.env && cloud.charDataRoot && wx.cloud) {
    return new Promise((resolve, reject) => {
      wx.cloud.downloadFile({
        fileID: `${cloud.charDataRoot}/${char}.json`,
        success: (res) => {
          const fs = wx.getFileSystemManager()
          fs.readFile({
            filePath: res.tempFilePath,
            encoding: 'utf8',
            success: (r) => {
              try {
                resolve(JSON.parse(r.data))
              } catch (e) {
                reject(new Error('字库解析失败'))
              }
            },
            fail: () => reject(new Error('字库读取失败'))
          })
        },
        fail: (err) => reject(new Error((err && err.errMsg) || '云字库下载失败'))
      })
    })
  }
  // 否则：CDN 请求
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.charDataCDN}/${encodeURIComponent(char)}.json`,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          resolve(res.data)
        } else {
          reject(new Error(`字库请求失败：${res.statusCode}`))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络异常'))
    })
  })
}

async function loadCharData(char) {
  if (memoryCache[char]) return memoryCache[char]

  // 1) 内置字库（需自行在 data/embedded.js 预置，可选）
  const embedded = require('../data/embedded')
  if (embedded && embedded[char]) {
    memoryCache[char] = embedded[char]
    return embedded[char]
  }

  // 2) 本地文件缓存
  let data = await readLocal(char)

  // 3) CDN 下载并写入缓存
  if (!data) {
    data = await fetchRemote(char)
    writeLocal(char, data)
  }

  memoryCache[char] = data
  return data
}

module.exports = { loadCharData }
