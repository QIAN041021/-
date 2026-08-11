const store = require('../../utils/store');
const auth = require('../../utils/auth');
const theme = require('../../utils/theme');
const navDrawer = require('../../utils/nav-drawer');

// ===== 马卡龙浅色调色盘（不同驿站用不同色调区分，背景均为柔和浅色，不与主题违和）=====
const MACARON = [
  { key: 'sakura',   name: '樱花粉', bg: '#FCE4EC', accent: '#F48FB1', text: '#C2185B' },
  { key: 'mint',     name: '薄荷绿', bg: '#E0F2F1', accent: '#80CBC4', text: '#00796B' },
  { key: 'lemon',    name: '鹅黄',   bg: '#FFF9C4', accent: '#FFD54F', text: '#F9A825' },
  { key: 'sky',      name: '天空蓝', bg: '#E3F2FD', accent: '#90CAF9', text: '#1565C0' },
  { key: 'lavender', name: '薰衣草', bg: '#EDE7F6', accent: '#B39DDB', text: '#5E35B1' },
  { key: 'peach',    name: '蜜桃',   bg: '#FBE9E7', accent: '#FFAB91', text: '#D84315' },
  { key: 'matcha',   name: '抹茶',   bg: '#F1F8E9', accent: '#AED581', text: '#558B2F' }
];
const COLOR_MAP = {};
MACARON.forEach((c) => { COLOR_MAP[c.key] = c; });

function genId() {
  return 'pk_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

function svg(vb, content) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" fill="none">' + content + '</svg>')
  );
}
const PLUS_ICON = svg('0 0 24 24', '<path d="M12 5V19M5 12H19" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>');
const DEL_ICON = svg('0 0 24 24', '<path d="M6 6L18 18M18 6L6 18" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>');
const CHECK_ICON = svg('0 0 24 24', '<path d="M5 12L10 17L19 7" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>');

function ensureStore() {
  if (!store.get()) {
    const s = auth.getSession();
    if (s && s.userId) store.init(s.userId);
  }
}

function resolveColor(key) {
  return COLOR_MAP[key] || MACARON[0];
}

Page({
  data: {
    themeClass: 'default',
    appFontScale: 1,
    appFontWeight: '400',
    categories: [],
    colorOptions: MACARON,
    plusIcon: PLUS_ICON,
    delIcon: DEL_ICON,
    checkIcon: CHECK_ICON,
    // 新建/编辑分类弹窗
    showCatModal: false,
    catName: '',
    catColor: 'sakura',
    editingCatId: '',
    // 添加取件码弹窗
    showCodeModal: false,
    codeInput: '',
    activeCatId: ''
  },

  onShow() {
    var app = getApp();
    this.setData({ themeClass: (app.globalData.currentTheme || 'default') });
    if (this.getTabBar()) this.getTabBar().refreshBar();
    theme.applyFont(this);
    navDrawer.attach(this);
    ensureStore();
    this.refresh();
  },

  noop() {},

  refresh() {
    const data = store.get();
    if (!data) return;
    this.renderCategories();
  },

  renderCategories() {
    const data = store.get();
    const list = (data.pickupCategories || []).map((cat) => {
      const color = resolveColor(cat.color);
      const codes = (cat.codes || []).map((c, i) => ({ ...c, index: i }));
      const picked = codes.filter((c) => c.picked).length;
      return {
        id: cat.id,
        stationName: cat.stationName,
        color: cat.color,
        colorBg: color.bg,
        colorAccent: color.accent,
        colorText: color.text,
        codes: codes,
        total: codes.length,
        picked: picked,
        progressText: codes.length ? (picked + '/' + codes.length + ' 已取') : '暂无取件码'
      };
    });
    this.setData({ categories: list });
  },

  // ===== 新建 / 编辑分类 =====
  openCatModal() {
    this.setData({ showCatModal: true, catName: '', catColor: MACARON[0].key, editingCatId: '' });
  },
  openEditCat(e) {
    const id = e.currentTarget.dataset.id;
    const data = store.get();
    const cat = (data.pickupCategories || []).find((c) => c.id === id);
    if (!cat) return;
    this.setData({ showCatModal: true, catName: cat.stationName, catColor: cat.color || MACARON[0].key, editingCatId: id });
  },
  closeCatModal() {
    this.setData({ showCatModal: false, editingCatId: '' });
  },
  onCatName(e) { this.setData({ catName: e.detail.value }); },
  selectCatColor(e) { this.setData({ catColor: e.currentTarget.dataset.key }); },

  confirmCat() {
    const name = (this.data.catName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入驿站名称', icon: 'none' });
      return;
    }
    const data = store.get();
    if (!data.pickupCategories) data.pickupCategories = [];

    if (this.data.editingCatId) {
      const cat = data.pickupCategories.find((c) => c.id === this.data.editingCatId);
      if (cat) {
        cat.stationName = name;
        cat.color = this.data.catColor;
      }
    } else {
      if (data.pickupCategories.some((c) => c.stationName === name)) {
        wx.showToast({ title: '该驿站已存在', icon: 'none' });
        return;
      }
      data.pickupCategories.push({
        id: genId(),
        stationName: name,
        color: this.data.catColor,
        codes: []
      });
    }
    store.save();
    this.setData({ showCatModal: false, editingCatId: '' });
    this.renderCategories();
  },

  deleteCat(e) {
    const id = e.currentTarget.dataset.id;
    const data = store.get();
    const cat = (data.pickupCategories || []).find((c) => c.id === id);
    if (!cat) return;
    wx.showModal({
      title: '删除分类',
      content: '确定删除「' + cat.stationName + '」及其下所有取件码？',
      confirmColor: '#E57373',
      success: (res) => {
        if (res.confirm) {
          data.pickupCategories = data.pickupCategories.filter((c) => c.id !== id);
          store.save();
          this.renderCategories();
        }
      }
    });
  },

  // ===== 添加取件码（支持批量：空格 / 逗号 / 换行 分隔）=====
  openCodeModal(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showCodeModal: true, codeInput: '', activeCatId: id });
  },
  closeCodeModal() {
    this.setData({ showCodeModal: false, activeCatId: '' });
  },
  onCodeInput(e) { this.setData({ codeInput: e.detail.value }); },

  confirmAddCodes() {
    const raw = (this.data.codeInput || '').trim();
    if (!raw) {
      wx.showToast({ title: '请输入取件码', icon: 'none' });
      return;
    }
    const parts = raw
      .split(/[\s,，、;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) {
      wx.showToast({ title: '请输入取件码', icon: 'none' });
      return;
    }

    const data = store.get();
    const cat = (data.pickupCategories || []).find((c) => c.id === this.data.activeCatId);
    if (!cat) return;
    if (!cat.codes) cat.codes = [];

    const existing = cat.codes.map((c) => c.code);
    let added = 0;
    parts.forEach((p) => {
      if (existing.indexOf(p) === -1) {
        cat.codes.push({ id: genId(), code: p, picked: false });
        existing.push(p);
        added++;
      }
    });

    store.save();
    this.setData({ showCodeModal: false, activeCatId: '' });
    this.renderCategories();

    if (added === 0) {
      wx.showToast({ title: '取件码已存在，未重复添加', icon: 'none' });
    } else {
      wx.showToast({ title: '已添加 ' + added + ' 个', icon: 'success' });
    }
  },

  // ===== 勾选已取 =====
  toggleCode(e) {
    const catId = e.currentTarget.dataset.cat;
    const index = e.currentTarget.dataset.index;
    const data = store.get();
    const cat = (data.pickupCategories || []).find((c) => c.id === catId);
    if (!cat || !cat.codes || !cat.codes[index]) return;
    cat.codes[index].picked = !cat.codes[index].picked;
    store.save();
    this.renderCategories();
  },

  deleteCode(e) {
    const catId = e.currentTarget.dataset.cat;
    const index = e.currentTarget.dataset.index;
    const data = store.get();
    const cat = (data.pickupCategories || []).find((c) => c.id === catId);
    if (!cat || !cat.codes) return;
    cat.codes.splice(index, 1);
    store.save();
    this.renderCategories();
  }
});
