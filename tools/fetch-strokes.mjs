/**
 * 批量下载教材汉字的笔画数据，供自建静态托管（云开发存储 / COS / OSS）。
 *
 * 用法（需 Node 18+，无需任何依赖）：
 *   node tools/fetch-strokes.mjs
 *   node tools/fetch-strokes.mjs --out ./dist-strokes --concurrency 8
 *
 * 产出：<out>/<字>.json（如 我.json）。
 * 上传到你的存储桶后，把 utils/config.js 的 charDataCDN 改成你的域名，例如：
 *   charDataCDN: 'https://your-bucket.cos.ap-guangzhou.myqcloud.com/hanzi-data'
 */
import { createRequire } from 'module'
import { mkdir, writeFile, access } from 'fs/promises'
import { join } from 'path'

const require = createRequire(import.meta.url)
const textbook = require('../data/textbook.js')

const args = process.argv.slice(2)
function arg(name, def) {
  const i = args.indexOf('--' + name)
  return i > -1 && args[i + 1] ? args[i + 1] : def
}

const OUT = arg('out', './dist-strokes')
const CONCURRENCY = Number(arg('concurrency', '6'))
const SOURCE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest'

function collectChars() {
  const set = new Set()
  Object.keys(textbook.lessons).forEach((id) => {
    const L = textbook.lessons[id]
    ;(L.shizi || []).forEach((c) => set.add(c))
    ;(L.xiezi || []).forEach((c) => set.add(c))
  })
  return Array.from(set)
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch (e) {
    return false
  }
}

async function download(char) {
  const file = join(OUT, char + '.json')
  if (await exists(file)) return 'skip'
  const url = SOURCE + '/' + encodeURIComponent(char) + '.json'
  const res = await fetch(url)
  if (!res.ok) throw new Error(char + ' HTTP ' + res.status)
  const text = await res.text()
  await writeFile(file, text)
  return 'ok'
}

async function run() {
  await mkdir(OUT, { recursive: true })
  const chars = collectChars()
  console.log('待下载字符：', chars.length, '，输出目录：', OUT)

  let index = 0
  let ok = 0
  let skip = 0
  let fail = 0

  async function worker() {
    while (index < chars.length) {
      const c = chars[index++]
      try {
        const r = await download(c)
        if (r === 'ok') ok += 1
        else skip += 1
      } catch (e) {
        fail += 1
        console.warn('失败：', c, e.message)
      }
      if (index % 100 === 0) console.log('进度', index, '/', chars.length)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log('完成：成功', ok, '跳过', skip, '失败', fail)
}

run()
