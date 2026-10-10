const textbook = require('../../data/textbook')
const { categories } = require('../../data/commonChars')
const storage = require('../../utils/storage')

function bookChars(bookId) {
  const set = new Set()
  const b = textbook.books.find((x) => x.id === bookId)
  if (b) {
    b.units.forEach((u) =>
      u.lessons.forEach((id) => {
        const L = textbook.lessons[id]
        if (!L) return
        ;(L.shizi || []).forEach((c) => set.add(c))
        ;(L.xiezi || []).forEach((c) => set.add(c))
      })
    )
  }
  return Array.from(set)
}

Page({
  data: {
    tabs: [
      { key: 'fav', name: '收藏' },
      { key: 'book', name: '教材' },
      { key: 'theme', name: '主题' },
      { key: 'custom', name: '输入' }
    ],
    tab: 'fav',
    books: textbook.books.map((b) => ({ id: b.id, short: b.short, name: b.name })),
    currentBookId: textbook.books[0].id,
    themes: categories.map((c) => ({ key: c.key, name: c.name })),
    currentTheme: categories[0].key,
    customText: '',
    chars: [],
    sel: {},
    selected: [],
    selCount: 0
  },

  onLoad() {
    const init = (getApp().globalData.worksheetPick || []).slice()
    const sel = {}
    init.forEach((c) => {
      sel[c] = true
    })
    this.setData({ sel, selected: init, selCount: init.length })
    this.loadTab('fav')
  },

  pickTab(e) {
    const tab = e.currentTarget.dataset.key
    this.setData({ tab })
    this.loadTab(tab)
  },

  loadTab(tab) {
    if (tab === 'fav') {
      this.setData({ chars: storage.getFavorites().slice() })
    } else if (tab === 'book') {
      this.setData({ chars: bookChars(this.data.currentBookId) })
    } else if (tab === 'theme') {
      const c = categories.find((x) => x.key === this.data.currentTheme)
      this.setData({ chars: c ? c.chars : [] })
    } else {
      this.setData({ chars: [] })
    }
  },

  pickBook(e) {
    this.setData({ currentBookId: e.currentTarget.dataset.id })
    this.loadTab('book')
  },

  pickTheme(e) {
    this.setData({ currentTheme: e.currentTarget.dataset.key })
    this.loadTab('theme')
  },

  onCustom(e) {
    this.setData({ customText: e.detail.value })
  },

  addCustom() {
    const add = (this.data.customText || '').split('').filter((c) => /[\u4e00-\u9fa5]/.test(c))
    const sel = Object.assign({}, this.data.sel)
    add.forEach((c) => {
      sel[c] = true
    })
    const selected = Object.keys(sel)
    this.setData({ sel, selected, selCount: selected.length, customText: '' })
  },

  toggle(e) {
    const c = e.currentTarget.dataset.char
    const sel = Object.assign({}, this.data.sel)
    if (sel[c]) delete sel[c]
    else sel[c] = true
    const selected = Object.keys(sel)
    this.setData({ sel, selected, selCount: selected.length })
  },

  clearSel() {
    this.setData({ sel: {}, selected: [], selCount: 0 })
  },

  done() {
    if (!this.data.selected.length) {
      wx.showToast({ title: '请先选择汉字', icon: 'none' })
      return
    }
    getApp().globalData.worksheetPick = this.data.selected
    wx.navigateBack()
  }
})
