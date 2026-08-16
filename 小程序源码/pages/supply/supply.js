var store = require('../../utils/store');
var auth = require('../../utils/auth');
var theme = require('../../utils/theme');
var navDrawer = require('../../utils/nav-drawer');

function ensureStore() {
  if (!store.get()) {
    var s = auth.getSession();
    if (s && s.userId) store.init(s.userId);
  }
}

function svg(vb, content) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" fill="none">' + content + '</svg>')
  );
}

// 各颜色对应的物品图标
var SUPPLY_ICONS = {
  'cute-pink': svg('0 0 24 24',
    '<path d="M9 2H15V4L16 6V20C16 21 15 22 14 22H10C9 22 8 21 8 20V6L9 4V2Z" fill="#F48FB1" stroke="#EC407A" stroke-width="0.8"/><rect x="10" y="8" width="4" height="10" rx="1" fill="white" fill-opacity="0.4"/>'),
  'cute-green': svg('0 0 24 24',
    '<rect x="5" y="6" width="14" height="14" rx="2" fill="#81C784" stroke="#388E3C" stroke-width="0.8"/><path d="M8 10H16M8 13H16M8 16H13" stroke="white" stroke-width="1" stroke-linecap="round"/><rect x="9" y="3" width="6" height="3" rx="1" fill="#A5D6A7"/>'),
  'cute-blue': svg('0 0 24 24',
    '<path d="M9 3H15V5L16 7V19C16 20 15 21 14 21H10C9 21 8 20 8 19V7L9 5V3Z" fill="#64B5F6" stroke="#1976D2" stroke-width="0.8"/><rect x="10" y="8" width="4" height="10" rx="1" fill="white" fill-opacity="0.4"/>'),
  'cute-yellow': svg('0 0 24 24',
    '<path d="M9 2H15V4L17 6V20C17 21 16 22 15 22H9C8 22 7 21 7 20V6L9 4V2Z" fill="#FFD54F" stroke="#F9A825" stroke-width="0.8"/><rect x="10" y="8" width="4" height="10" rx="1" fill="white" fill-opacity="0.4"/>'),
  'cute-purple': svg('0 0 24 24',
    '<path d="M9 2H15V4L16 6V20C16 21 15 22 14 22H10C9 22 8 21 8 20V6L9 4V2Z" fill="#CE93D8" stroke="#8E24AA" stroke-width="0.8"/><rect x="10" y="8" width="4" height="10" rx="1" fill="white" fill-opacity="0.4"/>'),
  'cute-orange': svg('0 0 24 24',
    '<path d="M9 2H15V4L17 6V20C17 21 16 22 15 22H9C8 22 7 21 7 20V6L9 4V2Z" fill="#FFB74D" stroke="#E65100" stroke-width="0.8"/><rect x="10" y="8" width="4" height="10" rx="1" fill="white" fill-opacity="0.4"/>')
};

var DEL_ICON = svg('0 0 10 10',
  '<path d="M2 2L8 8M8 2L2 8" stroke="#C88E8E" stroke-width="1.5" stroke-linecap="round"/>');
var EDIT_ICON = svg('0 0 13 13',
  '<path d="M8.5 1.5L11.5 4.5L4 12L1 12L1 9L8.5 1.5Z" stroke="#C88E8E" stroke-width="1" fill="none" stroke-linejoin="round"/>');

// 颜色选项
var COLOR_OPTIONS = [
  { colorClass: 'cute-pink',   barColor: '#F48FB1', gradient: 'linear-gradient(135deg, #FFE8E8 0%, #FFD6D6 100%)' },
  { colorClass: 'cute-green',  barColor: '#81C784', gradient: 'linear-gradient(135deg, #E8F5E9 0%, #D6ECD8 100%)' },
  { colorClass: 'cute-blue',   barColor: '#64B5F6', gradient: 'linear-gradient(135deg, #E3F2FD 0%, #D1ECFE 100%)' },
  { colorClass: 'cute-yellow', barColor: '#FFD54F', gradient: 'linear-gradient(135deg, #FFF8E1 0%, #FFEFC4 100%)' },
  { colorClass: 'cute-purple', barColor: '#CE93D8', gradient: 'linear-gradient(135deg, #F3E5F5 0%, #E8D5EC 100%)' },
  { colorClass: 'cute-orange', barColor: '#FFB74D', gradient: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' }
];

Page({
  data: {
    delIcon: '',
    editIcon: '',
    themeClass: 'default',
    appFontScale: 1,
    appFontWeight: '400',
    themePrimary: '#F4B8B8',
    categories: [],        // [{ id, name, items: [...] }]
    // 添加物品弹窗
    showAddModal: false,
    addModalCatId: '',
    supplyName: '',
    supplyPercent: 50,
    selectedColorIndex: 0,
    colorOptions: [],
    // 修改比例弹窗
    showEditModal: false,
    editSupplyId: '',
    editSupplyName: '',
    editPercent: 50,
    // 分类编辑弹窗
    showCatModal: false,
    catModalMode: '',     // 'add' | 'edit'
    catEditId: '',
    catName: ''
  },

  onShow() {
    var app = getApp();
    var themeName = app.globalData.currentTheme || 'default';
    this.setData({
      themeClass: themeName,
      themePrimary: theme.getTheme(themeName).primary,
      delIcon: DEL_ICON,
      editIcon: EDIT_ICON,
      colorOptions: COLOR_OPTIONS.map(function (c, i) {
        return { colorClass: c.colorClass, barColor: c.barColor, gradient: c.gradient, selected: i === 0 };
      })
    });
    if (this.getTabBar()) this.getTabBar().refreshBar();
    theme.applyFont(this);
    navDrawer.attach(this);
    this.refresh();
  },

  noop() {},

  refresh() {
    var data = store.get();
    if (!data) return;
    var categories = (data.supplyCategories || []).map(function (cat) {
      var items = (data.supplies || []).filter(function (s) {
        return (s.categoryId || 'cat_default') === cat.id;
      }).map(function (s) {
        return {
          id: s.id,
          name: s.name,
          percent: s.percent,
          colorClass: s.colorClass,
          barColor: s.barColor,
          icon: SUPPLY_ICONS[s.colorClass] || SUPPLY_ICONS['cute-pink']
        };
      });
      return { id: cat.id, name: cat.name, items: items };
    });
    this.setData({ categories: categories });
  },

  // ===== 添加物品 =====
  openAddModal(e) {
    var catId = e.currentTarget.dataset.catid || (this.data.categories[0] && this.data.categories[0].id) || 'cat_default';
    this.setData({
      showAddModal: true,
      addModalCatId: catId,
      supplyName: '',
      supplyPercent: 50,
      selectedColorIndex: 0,
      colorOptions: COLOR_OPTIONS.map(function (c, i) {
        return { colorClass: c.colorClass, barColor: c.barColor, gradient: c.gradient, selected: i === 0 };
      })
    });
  },
  closeAddModal() {
    this.setData({ showAddModal: false });
  },
  onSupplyName(e) {
    this.setData({ supplyName: e.detail.value });
  },
  onSupplyPercent(e) {
    this.setData({ supplyPercent: e.detail.value });
  },
  selectColor(e) {
    var idx = e.currentTarget.dataset.index;
    var colors = this.data.colorOptions.map(function (c, i) {
      c.selected = i === idx;
      return c;
    });
    this.setData({ colorOptions: colors, selectedColorIndex: idx });
  },
  selectAddCat(e) {
    this.setData({ addModalCatId: e.currentTarget.dataset.catid });
  },
  confirmAddSupply() {
    var name = (this.data.supplyName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' });
      return;
    }
    var co = COLOR_OPTIONS[this.data.selectedColorIndex];
    var data = store.get();
    data.supplies.push({
      id: 'supply-' + Date.now(),
      name: name,
      percent: this.data.supplyPercent,
      colorClass: co.colorClass,
      barColor: co.barColor,
      categoryId: this.data.addModalCatId
    });
    store.save();
    this.setData({ showAddModal: false });
    this.refresh();
  },

  // ===== 修改比例 =====
  openEditModal(e) {
    var id = e.currentTarget.dataset.id;
    var item = null;
    this.data.categories.forEach(function (cat) {
      cat.items.forEach(function (s) {
        if (s.id === id) item = s;
      });
    });
    if (!item) return;
    this.setData({
      showEditModal: true,
      editSupplyId: id,
      editSupplyName: item.name,
      editPercent: item.percent
    });
  },
  closeEditModal() {
    this.setData({ showEditModal: false });
  },
  onEditPercent(e) {
    this.setData({ editPercent: e.detail.value });
  },
  confirmEditPercent() {
    var data = store.get();
    var editId = this.data.editSupplyId;
    var s = data.supplies.find(function (x) { return x.id === editId; });
    if (s) {
      s.percent = this.data.editPercent;
      store.save();
    }
    this.setData({ showEditModal: false });
    this.refresh();
  },

  // ===== 删除物品 =====
  deleteSupply(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '删除',
      content: '确定删除这个项目吗？',
      confirmColor: this.data.themePrimary,
      success: function (res) {
        if (res.confirm) {
          var data = store.get();
          data.supplies = data.supplies.filter(function (s) { return s.id !== id; });
          store.save();
          that.refresh();
        }
      }
    });
  },

  // ===== 分类管理 =====
  openAddCatModal() {
    this.setData({ showCatModal: true, catModalMode: 'add', catEditId: '', catName: '' });
  },
  openEditCatModal(e) {
    var cat = this.data.categories.find(function (c) { return c.id === e.currentTarget.dataset.id; });
    if (!cat) return;
    this.setData({ showCatModal: true, catModalMode: 'edit', catEditId: cat.id, catName: cat.name });
  },
  closeCatModal() {
    this.setData({ showCatModal: false });
  },
  onCatName(e) {
    this.setData({ catName: e.detail.value });
  },
  confirmCatModal() {
    var name = (this.data.catName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写分类名称', icon: 'none' });
      return;
    }
    var data = store.get();
    if (this.data.catModalMode === 'add') {
      var newId = 'cat_' + Date.now();
      if (!data.supplyCategories) data.supplyCategories = [];
      data.supplyCategories.push({ id: newId, name: name });
      store.save();
    } else {
      var cat = (data.supplyCategories || []).find(function (c) { return c.id === this.data.catEditId; }.bind(this));
      if (cat) {
        cat.name = name;
        store.save();
      }
    }
    this.setData({ showCatModal: false });
    this.refresh();
  },
  deleteCat(e) {
    var catId = e.currentTarget.dataset.id;
    var cat = this.data.categories.find(function (c) { return c.id === catId; });
    if (!cat) return;
    var itemCount = cat.items.length;
    var msg = itemCount > 0
      ? '该分类下有 ' + itemCount + ' 个项目，删除后项目将归入默认分类。确定删除？'
      : '确定删除这个分类吗？';
    var that = this;
    wx.showModal({
      title: '删除分类',
      content: msg,
      confirmColor: this.data.themePrimary,
      success: function (res) {
        if (res.confirm) {
          var data = store.get();
          // 将该分类下的物品归入默认分类
          if (catId !== 'cat_default') {
            (data.supplies || []).forEach(function (s) {
              if (s.categoryId === catId) s.categoryId = 'cat_default';
            });
            data.supplyCategories = (data.supplyCategories || []).filter(function (c) { return c.id !== catId; });
          } else {
            // 不允许删除默认分类，只清空
            data.supplies = (data.supplies || []).filter(function (s) { return s.categoryId !== 'cat_default'; });
          }
          store.save();
          that.refresh();
        }
      }
    });
  }
});
