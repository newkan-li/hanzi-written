/**
 * 生成 data/charDict.js —— 汉字字典（拼音 / 部首 / 笔画 / 结构 / 释义）
 *
 * 数据来源（均为开放数据）：
 *   - pwxcoo/chinese-xinhua  data/word.json  → 部首 radicals / 笔画 strokes / 拼音 pinyin / 释义 explanation
 *   - skishore/makemeahanzi  dictionary.txt  → 部首 radical / IDS 分解 decomposition（用于推断结构）
 *
 * 只覆盖小程序会用到的字：教材字表 ∪ 成语 ∪ 古诗 ∪ 手工字典 charInfo。
 *
 * 用法：node tools/gen-dict.mjs
 */
import { createRequire } from 'module'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const XINHUA_URL = 'https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/word.json'
const MMH_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt'
const CACHE_DIR = join(os.tmpdir(), 'hanzi-gen-cache')

const IDS_STRUCTURE = {
  '⿰': '左右',
  '⿱': '上下',
  '⿲': '左中右',
  '⿳': '上中下',
  '⿴': '全包围',
  '⿵': '半包围',
  '⿶': '半包围',
  '⿷': '半包围',
  '⿸': '半包围',
  '⿹': '半包围',
  '⿺': '半包围',
  '⿻': '镶嵌'
}

function neededChars() {
  const set = new Set()
  const add = (cs) => cs.forEach((c) => c && set.add(c))
  try {
    const tb = require(join(ROOT, 'data/textbook.js'))
    Object.keys(tb.lessons).forEach((id) => {
      const L = tb.lessons[id]
      add(L.shizi || [])
      add(L.xiezi || [])
    })
  } catch (e) {
    /* ignore */
  }
  try {
    require(join(ROOT, 'data/idioms.js')).idioms.forEach((it) => add(it.word.split('')))
  } catch (e) {
    /* ignore */
  }
  try {
    require(join(ROOT, 'data/poems.js')).forEach((p) => add((p.lines || []).join('').split('')))
  } catch (e) {
    /* ignore */
  }
  try {
    add(Object.keys(require(join(ROOT, 'data/charInfo.js')).charInfo))
  } catch (e) {
    /* ignore */
  }
  return Array.from(set).filter((c) => /[\u4e00-\u9fa5]/.test(c))
}

function cleanMeaning(text, char) {
  if (!text) return ''
  let s = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  // 去掉开头的字头（如 “聚 (形声…” 的“聚”）
  if (char && s.indexOf(char) === 0) s = s.slice(char.length).trim()
  // 循环剥离开头的词性标记〈…〉、考据括注(…)、以及“同本义/泛指”等
  let guard = 0
  let changed = true
  while (changed && guard < 6) {
    guard += 1
    changed = false
    s = s.replace(/^[\s:：·、,，。;；]+/, '')
    if (/^〈[^〉]*〉/.test(s)) {
      s = s.replace(/^〈[^〉]*〉\s*/, '')
      changed = true
    }
    if (s[0] === '(' || s[0] === '（') {
      const close = s.indexOf(')')
      const close2 = s.indexOf('）')
      let idx = -1
      if (close > -1 && close2 > -1) idx = Math.min(close, close2)
      else idx = Math.max(close, close2)
      if (idx > -1 && idx < 60) {
        s = s.slice(idx + 1).trim()
        changed = true
      }
    }
    const m = s.match(/^(同本义|泛指|指|即|引申)[\s:：,，、]*/)
    if (m) {
      s = s.slice(m[0].length).trim()
      changed = true
    }
  }
  s = s.replace(/^[\s:：·、,，。;；]+/, '')
  if (s.length > 30) s = s.slice(0, 30) + '…'
  return s
}

function structureOf(decomposition) {
  if (!decomposition) return '独体'
  const first = decomposition[0]
  return IDS_STRUCTURE[first] || '独体'
}

async function getText(url, cachePath) {
  if (cachePath && existsSync(cachePath)) {
    console.log('  使用本地缓存', cachePath)
    return readFile(cachePath, 'utf8')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(url + ' HTTP ' + res.status)
  const text = await res.text()
  if (cachePath) {
    try {
      await writeFile(cachePath, text)
    } catch (e) {
      /* ignore */
    }
  }
  return text
}

async function run() {
  const chars = neededChars()
  console.log('需要字典的汉字：', chars.length)
  await mkdir(CACHE_DIR, { recursive: true })

  console.log('下载 chinese-xinhua word.json …')
  const xinhua = JSON.parse(await getText(XINHUA_URL, join(CACHE_DIR, 'xinhua-word.json')))
  const xmap = {}
  xinhua.forEach((w) => {
    if (w.word && w.word.length === 1) xmap[w.word] = w
  })
  console.log('  xinhua 条目：', Object.keys(xmap).length)

  console.log('下载 makemeahanzi dictionary.txt …')
  const mmhText = await getText(MMH_URL, join(CACHE_DIR, 'mmh-dictionary.txt'))
  const mmap = {}
  mmhText.split('\n').forEach((line) => {
    if (!line.trim()) return
    try {
      const o = JSON.parse(line)
      if (o.character) mmap[o.character] = o
    } catch (e) {
      /* ignore */
    }
  })
  console.log('  makemeahanzi 条目：', Object.keys(mmap).length)

  const dict = {}
  chars.forEach((c) => {
    const x = xmap[c] || {}
    const m = mmap[c] || {}
    const entry = {}
    const pinyin = (x.pinyin || (m.pinyin && m.pinyin[0]) || '').replace(/ɡ/g, 'g')
    const radical = x.radicals || m.radical || ''
    const structure = structureOf(m.decomposition)
    const meaning = cleanMeaning(x.explanation, c)
    if (pinyin) entry.pinyin = pinyin
    if (radical) entry.radical = radical
    if (x.strokes) entry.strokes = Number(x.strokes)
    if (structure) entry.structure = structure
    if (meaning) entry.meaning = meaning
    if (Object.keys(entry).length) dict[c] = entry
  })

  const out =
    '// 由 tools/gen-dict.mjs 生成（chinese-xinhua + makemeahanzi），请勿手动编辑。\n' +
    'module.exports = ' +
    JSON.stringify(dict) +
    '\n'
  await writeFile(join(ROOT, 'data/charDict.js'), out)
  console.log('写出 data/charDict.js，条目：', Object.keys(dict).length, '，约', Math.round(out.length / 1024), 'KB')
}

run().catch((e) => {
  console.error('生成失败：', e.message)
  process.exit(1)
})
