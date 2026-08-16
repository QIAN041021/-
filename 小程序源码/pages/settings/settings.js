var store = require('../../utils/store');
var auth = require('../../utils/auth');
var cloud = require('../../utils/cloud');
var theme = require('../../utils/theme');
var navDrawer = require('../../utils/nav-drawer');
var reg = require('../../utils/pages-registry');

var PAGE_INFO = [
  { path: 'pages/index/index', name: '首页', icon: '🏠', canHide: false },
  { path: 'pages/account/account', name: '记账', icon: '💰', canHide: true },
  { path: 'pages/recipe/recipe', name: '菜谱', icon: '🍳', canHide: true },
  { path: 'pages/supply/supply', name: '进度条', icon: '📊', canHide: true },
  { path: 'pages/pickup/pickup', name: '取件码', icon: '📦', canHide: true }
];

function ensureStore() {
  if (!store.get()) {
    var s = auth.getSession();
    if (s && s.userId) store.init(s.userId);
  }
}

Page({
  data: {
    pageList: [],      // 基础页：排序+隐藏状态（决定底部栏前4位固定显示）
    extraList: [],     // 额外页（药物/设置等）：是否允许加入底部栏第5位
    themes: [],
    currentTheme: 'default',
    themeClass: 'default',
    feedback: '',
    activeTab: 'pages', // 'pages' | 'theme' | 'feedback' | 'font'
    appFontScale: 1,
    appFontWeight: '400',
    fontScale: 1,
    fontScaleIndex: 1,
    fontScaleLabel: '标准',
    fontWeight: '400',
    fontScaleOptions: [],
    fontWeightOptions: []
  },

  onShow() {
    var app = getApp();
    this.setData({ themeClass: (app.globalData.currentTheme || 'default') });
    ensureStore();
    this.loadSettings();
    theme.applyFont(this);
    navDrawer.attach(this);
  },

  noop() {},

  loadSettings() {
    var data = store.get();
    if (!data || !data.settings) return;
    var s = data.settings;
    var order = s.tabOrder && s.tabOrder.length ? s.tabOrder : PAGE_INFO.map(function (p) { return p.path; });
    var hidden = s.hiddenPages || [];

    // 构建 pageList：按 tabOrder 排列，标注隐藏状态
    var pageList = order.map(function (path) {
      var info = PAGE_INFO.find(function (p) { return p.path === path; });
      if (!info) return null;
      return {
        path: info.path,
        name: info.name,
        icon: info.icon,
        canHide: info.canHide,
        hidden: hidden.indexOf(path) !== -1
      };
    }).filter(Boolean);

    // 补上未在 order 中的页面
    PAGE_INFO.forEach(function (info) {
      if (!pageList.find(function (p) { return p.path === info.path; })) {
        pageList.push({
          path: info.path,
          name: info.name,
          icon: info.icon,
          canHide: info.canHide,
          hidden: hidden.indexOf(info.path) !== -1
        });
      }
    });

    var themes = theme.getThemeList().map(function (t) {
      return {
        name: t.name,
        label: t.label,
        bg: t.bg,
        primary: t.primary,
        accent: t.accent,
        selected: t.name === (s.theme || 'default')
      };
    });

    // 额外页（药物/设置等）：是否允许占据底部栏第5动态位。
    // 设置页锁定（固定在侧边栏，不可入栏）；其余按 navbarExtra 决定。
    var navbarExtra = s.navbarExtra || [];
    var extraList = reg.EXTRA_PAGES.map(function (info) {
      var locked = info.pagePath === 'pages/settings/settings';
      return {
        path: info.pagePath,
        name: info.text,
        icon: info.icon,
        inNavbar: locked ? false : (navbarExtra.indexOf(info.pagePath) !== -1),
        locked: locked
      };
    });

    var scaleOpts = theme.getFontScaleOptions();
    var weightOpts = theme.getFontWeightOptions();
    var curScale = typeof s.fontScale === 'number' ? s.fontScale : 1;
    var scaleIdx = 1;
    for (var i = 0; i < scaleOpts.length; i++) {
      if (scaleOpts[i].value === curScale) { scaleIdx = i; break; }
    }
    var curWeight = s.fontWeight || '400';

    this.setData({
      pageList: pageList,
      extraList: extraList,
      themes: themes,
      currentTheme: s.theme || 'default',
      feedback: s.feedback || '',
      fontScaleOptions: scaleOpts,
      fontWeightOptions: weightOpts,
      fontScale: curScale,
      fontScaleIndex: scaleIdx,
      fontScaleLabel: (scaleOpts[scaleIdx] || scaleOpts[1]).label,
      fontWeight: curWeight
    });
  },

  // ===== 切换 tab =====
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // ===== 隐藏/显示页面 =====
  toggleHide(e) {
    var path = e.currentTarget.dataset.path;
    var pageList = this.data.pageList.slice();
    var item = pageList.find(function (p) { return p.path === path; });
    if (!item || !item.canHide) return;
    item.hidden = !item.hidden;
    this.setData({ pageList: pageList });
    this.saveSettings();
  },

  // ===== 排序：上移/下移 =====
  moveUp(e) {
    var index = e.currentTarget.dataset.index;
    if (index === 0) return;
    var pageList = this.data.pageList.slice();
    var tmp = pageList[index - 1];
    pageList[index - 1] = pageList[index];
    pageList[index] = tmp;
    this.setData({ pageList: pageList });
    this.saveSettings();
  },

  moveDown(e) {
    var index = e.currentTarget.dataset.index;
    var pageList = this.data.pageList.slice();
    if (index === pageList.length - 1) return;
    var tmp = pageList[index + 1];
    pageList[index + 1] = pageList[index];
    pageList[index] = tmp;
    this.setData({ pageList: pageList });
    this.saveSettings();
  },

  // ===== 额外页：加入/移出底部栏第5位 =====
  toggleNavbar(e) {
    var path = e.currentTarget.dataset.path;
    var extraList = this.data.extraList.slice();
    var item = extraList.find(function (p) { return p.path === path; });
    if (!item || item.locked) return;
    item.inNavbar = !item.inNavbar;
    this.setData({ extraList: extraList });
    // 若关闭该页且它正占据第5位，复位成默认（取件码），避免底栏出现无法进入的死位
    var data = store.get();
    if (!item.inNavbar && data.settings && data.settings.fifthPage === path) {
      data.settings.fifthPage = reg.DEFAULT_FIFTH;
      store.save();
    }
    this.saveSettings();
  },

  // ===== 选择主题 =====
  selectTheme(e) {
    var name = e.currentTarget.dataset.name;
    var themes = this.data.themes.map(function (t) {
      t.selected = t.name === name;
      return t;
    });
    this.setData({ themes: themes, currentTheme: name });
    this.saveSettings();
    // 实时应用主题：导航栏 + 所有活跃页面 + TabBar
    theme.apply(name);
    var tabBar = this.getTabBar();
    if (tabBar && tabBar.refreshBar) tabBar.refreshBar();
  },

  // ===== 字体大小 =====
  onFontScale(e) {
    var idx = e.detail.value;
    var opts = this.data.fontScaleOptions;
    var opt = opts[idx] || opts[1];
    this.setData({ fontScaleIndex: idx, fontScaleLabel: opt.label, fontScale: opt.value });
    this.saveSettings();
    theme.applyFont(this); // 立即在当前页面预览
  },

  // ===== 字体粗细 =====
  onFontWeight(e) {
    var w = e.currentTarget.dataset.w;
    this.setData({ fontWeight: w });
    this.saveSettings();
    theme.applyFont(this);
  },

  // ===== 反馈 =====
  onFeedback(e) {
    this.setData({ feedback: e.detail.value });
  },

  async saveFeedback() {
    var feedback = (this.data.feedback || '').trim();
    if (!feedback) {
      wx.showToast({ title: '请先写下建议', icon: 'none' });
      return;
    }

    // 先保存本地，保证云端暂时不可用时建议也不会丢失。
    this.setData({ feedback: feedback });
    this.saveSettings();

    if (!cloud.isConfigured() || !wx.cloud || !wx.cloud.database) {
      wx.showToast({ title: '已保存到本机，云环境未配置', icon: 'none', duration: 2200 });
      return;
    }

    wx.showLoading({ title: '提交中' });
    try {
      var session = auth.getSession() || {};
      var db = wx.cloud.database();
      await db.collection('feedback').add({
        data: {
          content: feedback,
          userId: session.userId || '',
          account: session.account || '',
          createdAt: db.serverDate(),
          source: 'settings'
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '建议已提交', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '云端提交失败，已保存到本机', icon: 'none', duration: 2400 });
    }
  },

  // ===== 保存设置 =====
  saveSettings() {
    var data = store.get();
    if (!data.settings) data.settings = {};
    data.settings.tabOrder = this.data.pageList.map(function (p) { return p.path; });
    data.settings.hiddenPages = this.data.pageList.filter(function (p) { return p.hidden; }).map(function (p) { return p.path; });
    // 额外页入栏清单：只有开启且未锁定的页才允许占第5位
    data.settings.navbarExtra = this.data.extraList.filter(function (p) { return p.inNavbar && !p.locked; }).map(function (p) { return p.path; });
    data.settings.theme = this.data.currentTheme;
    data.settings.feedback = this.data.feedback;
    data.settings.fontScale = this.data.fontScale;
    data.settings.fontWeight = this.data.fontWeight;
    store.save();
  }
});
