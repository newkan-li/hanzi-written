/**
 * 按主题给「课本汉字」分类，生成 data/themeChars.js：
 *   入门基础 / 日常常用 / 自然万物 / 品德修养 / 古诗名句
 *
 * 思路：
 *   - 只使用课本出现的字（data/textbook.js 的识字表+写字表并集）。
 *   - 自然 / 品德 / 入门 用主题词表种子，与课本字集求交集。
 *   - 古诗名句 = 课本古诗用字（data/poems.js）与课本字集求交集。
 *   - 日常常用 = 课本字集中未被上面收录的字（按课本出现顺序，取前 N）。
 *
 * 用法：node tools/gen-themes.mjs
 * 说明：语义分类为启发式，尽力而为，可继续扩充词表后重跑。
 */
import { createRequire } from 'module'
import { writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const textbook = require(join(ROOT, 'data/textbook.js'))
const poems = require(join(ROOT, 'data/poems.js'))

const DAILY_CAP = 400

const SEEDS = {
  basic: '一二三四五六七八九十百千万零两半双个只条张把件对群片块元角分大小多少上下左右前后中内外里旁东西南北人口手足头目耳鼻舌牙身心男女老少父母爸妈爷奶哥姐弟妹儿女的了吗呢吧呀啊哦着过得地这那哪谁什么怎样各每另来去回走跑跳飞坐立站看听说想是有在没不无也都还很太最更我你他她它们红黄蓝绿青紫黑白灰彩早晚昨今年时分秒点开关闭出入进退',
  nature: '天地云雨雪风雷电霜露虹霞雾晴阴冷热暖凉山水江河湖海泉溪波浪岸岛峰岭谷原野滩石泥沙土壤金铜铁银玉火田禾花草树木林森叶根枝芽果实松柏杨柳桃李梅兰竹菊荷莲鸟鱼虫兽猫狗猪牛羊马兔鸡鸭鹅虎狼狮象鹿蛇蛙蝶蜂蚁燕雀鹰鹤日月星辰宇宙银河光明暗影春夏秋冬季节早晚昼夜苗稻麦豆瓜塘池',
  virtue: '仁义礼智信孝悌忠勇勤俭诚善德美志向思恩爱情节操守谦虚恭敬谨慎廉耻荣辱喜怒哀乐恨憎怜惜悲欢忧念真诚感谢尊敬友爱互助团结正宽容忍让助人为乐坚强毅力恒心礼貌文明勤奋刻苦惜时守善良仁慈品德道修养榜样励纪'
}

function collectTextbookChars() {
  const order = []
  const set = new Set()
  Object.keys(textbook.lessons).forEach((id) => {
    const L = textbook.lessons[id]
    ;[].concat(L.shizi || [], L.xiezi || []).forEach((c) => {
      if (c && !set.has(c)) {
        set.add(c)
        order.push(c)
      }
    })
  })
  return { order, set }
}

function collectPoemChars() {
  const set = new Set()
  poems.forEach((p) => {
    ;(p.lines || []).join('').split('').forEach((c) => {
      if (/[\u4e00-\u9fa5]/.test(c)) set.add(c)
    })
  })
  return set
}

function intersect(seedStr, tbSet) {
  const out = []
  const seen = new Set()
  for (const c of seedStr) {
    if (/[\u4e00-\u9fa5]/.test(c) && tbSet.has(c) && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  return out
}

async function run() {
  const { order, set } = collectTextbookChars()
  const poemSet = collectPoemChars()

  const nature = intersect(SEEDS.nature, set)
  const virtue = intersect(SEEDS.virtue, set)
  const basic = intersect(SEEDS.basic, set)
  const base = new Set([...nature, ...virtue, ...basic])
  const poem = Array.from(poemSet).filter((c) => set.has(c) && !base.has(c))

  const used = new Set([...base, ...poem])
  const daily = order.filter((c) => !used.has(c)).slice(0, DAILY_CAP)

  const data = {
    basic,
    daily,
    nature,
    virtue,
    poem
  }
  const out =
    '// 由 tools/gen-themes.mjs 生成（按主题给课本汉字分类），请勿手动编辑。\n' +
    'module.exports = ' +
    JSON.stringify(data) +
    '\n'
  await writeFile(join(ROOT, 'data/themeChars.js'), out)

  console.log('课本字集：', set.size)
  ;['basic', 'daily', 'nature', 'virtue', 'poem'].forEach((k) => {
    console.log(k.padEnd(7), data[k].length)
  })
  console.log('完成，输出 data/themeChars.js')
}

run().catch((e) => {
  console.error('生成失败：', e.message)
  process.exit(1)
})
