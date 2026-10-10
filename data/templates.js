/**
 * 字帖模板：预制字表，供字帖生成页使用
 */
const templates = [
  {
    key: 'jingyesi',
    name: '静夜思',
    desc: '李白 · 五言绝句',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡']
  },
  {
    key: 'chunxiao',
    name: '春晓',
    desc: '孟浩然 · 五言绝句',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少']
  },
  {
    key: 'yongliu',
    name: '咏柳',
    desc: '贺知章 · 七言绝句',
    lines: ['碧玉妆成一树高', '万条垂下绿丝绦', '不知细叶谁裁出', '二月春风似剪刀']
  },
  {
    key: 'baijiaxing',
    name: '百家姓',
    desc: '传统蒙学',
    lines: ['赵钱孙李', '周吴郑王', '冯陈褚卫', '蒋沈韩杨']
  },
  {
    key: 'dizigui',
    name: '弟子规',
    desc: '传统蒙学',
    lines: ['父母呼 应勿缓', '父母命 行勿懒', '父母教 须敬听', '父母责 须顺承']
  },
  {
    key: 'chengyu',
    name: '常用成语',
    desc: '四字成语',
    lines: ['一心一意', '勤能补拙', '温故知新', '持之以恒']
  }
]

module.exports = { templates }
