/**
 * 从开源数据集 fsiceangel/zishi 生成教材数据文件：
 *   data/textbook.js       册/单元/课 + 识字表/写字表/例词
 *   data/textbookPinyin.js 2999 字拼音表
 *   data/poems.js          课本古诗 113 首
 *
 * 用法（Node 18+，无需依赖）：
 *   node tools/gen-data.mjs
 *   node tools/gen-data.mjs --src <基地址> --out ./data
 *
 * 说明：数据来源为第三方整理（未声明 LICENSE），仅字表/拼音/古诗原文等事实性内容；
 * 正式发布前请自行核对授权。成语(idioms.js)与字典(charInfo.js)为手工整理，不在此脚本内。
 */
import { createRequire } from 'module'
import { writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const args = process.argv.slice(2)
function arg(name, def) {
  const i = args.indexOf('--' + name)
  return i > -1 && args[i + 1] ? args[i + 1] : def
}

const SRC = arg('src', 'https://raw.githubusercontent.com/fsiceangel/zishi/main/src/data')
const OUT = resolve(arg('out', join(ROOT, 'data')))

async function getJSON(name) {
  const res = await fetch(`${SRC}/${name}`)
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`)
  return res.json()
}

const HEADER = '// 由 tools/gen-data.mjs 生成，请勿手动编辑。数据来源：fsiceangel/zishi\n'

async function genTextbook(vols, meta) {
  const counts = {}
  ;(meta.books || []).forEach((b) => {
    counts[b.id] = { shizi: b.shizi, xiezi: b.xiezi, words: b.words, poems: b.poems }
  })
  const books = []
  const lessons = {}
  vols.forEach((b) => {
    const units = (b.units || []).map((u) => ({
      title: u.title,
      theme: u.theme,
      lessons: (u.lessons || [])
        .filter((id) => b.lessons[id])
        .map((id) => {
          const L = b.lessons[id]
          lessons[id] = {
            title: L.title,
            kind: L.kind,
            shizi: L.shizi || [],
            xiezi: L.xiezi || [],
            words: L.words || []
          }
          return id
        })
    }))
    const c = counts[b.id] || {}
    books.push({
      id: b.id,
      name: b.name,
      short: b.short,
      grade: b.grade,
      term: b.term,
      shiziCount: c.shizi || 0,
      xieziCount: c.xiezi || 0,
      units
    })
  })
  const out = HEADER + 'module.exports = ' + JSON.stringify({ books, lessons }) + '\n'
  await writeFile(join(OUT, 'textbook.js'), out)
  return { books: books.length, lessons: Object.keys(lessons).length }
}

async function genPinyin(chars) {
  const map = {}
  Object.keys(chars).forEach((c) => {
    const py = chars[c].py
    if (py) map[c] = py
  })
  const out = HEADER + 'module.exports = ' + JSON.stringify(map) + '\n'
  await writeFile(join(OUT, 'textbookPinyin.js'), out)
  return { chars: Object.keys(map).length }
}

async function genPoems(poems) {
  const out = poems.map((p) => ({
    id: p.id,
    book: p.book,
    title: p.title,
    author: p.author || '',
    dynasty: p.dynasty || '',
    type: p.type || '诗',
    lines: p.lines || []
  }))
  const str = HEADER + 'module.exports = ' + JSON.stringify(out) + '\n'
  await writeFile(join(OUT, 'poems.js'), str)
  return { poems: out.length }
}

async function run() {
  console.log('数据源：', SRC)
  console.log('输出目录：', OUT)
  const [vols, meta, chars, poems] = await Promise.all([
    getJSON('volumes.json'),
    getJSON('meta.json'),
    getJSON('chars.json'),
    getJSON('poems.json')
  ])
  console.log('textbook:', await genTextbook(vols, meta))
  console.log('pinyin:', await genPinyin(chars))
  console.log('poems:', await genPoems(poems))
  console.log('完成。')
}

run().catch((e) => {
  console.error('生成失败：', e.message)
  process.exit(1)
})
