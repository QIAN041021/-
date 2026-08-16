// custom-tab-bar/index.js - 自定义底部导航（支持排序/隐藏/主题）

var store = require('../utils/store');
var auth = require('../utils/auth');
var themeMgr = require('../utils/theme');

var reg = require('../utils/pages-registry');

var TAB_PAGES = reg.TAB_PAGES;
var DEFAULT_FIFTH = reg.DEFAULT_FIFTH;
function getTabMeta(p) { return reg.getTabMeta(p); }
function getExtraMeta(p) { return reg.getExtraMeta(p); }
function buildIcon(p, c) { return reg.buildIcon(p, c); }
function textOf(p) { return reg.textOf(p); }

function ensureStore() {
  if (!store.get()) {
    var s = auth.getSession();
    if (s && s.userId) store.init(s.userId);
  }
}

function buildList() {
  ensureStore();
  var data = store.get();
  var s = data && data.settings ? data.settings : {};
  var themeName = s.theme || 'default';
  var theme = themeMgr.getTabTheme(themeName);

  var order = s.tabOrder && s.tabOrder.length ? s.tabOrder : TAB_PAGES.map(function (r) { return r.pagePath; });
  var hidden = s.hiddenPages || [];
  var fifthPage = s.fifthPage || DEFAULT_FIFTH;
  var navbarExtra = s.navbarExtra || [];

  function tabItem(raw) {
    return {
      pagePath: raw.pagePath,
      text: raw.text,
      iconIn: buildIcon(raw.pagePath, theme.inactive),
      iconAc: buildIcon(raw.pagePath, theme.active),
      isExtra: false
    };
  }
  function extraItem(meta) {
    return {
      pagePath: meta.pagePath,
      text: meta.text,
      iconIn: buildIcon(meta.pagePath, theme.inactive),
      iconAc: buildIcon(meta.pagePath, theme.active),
      isExtra: true
    };
  }

  // 前4位：基础页按 order 过滤 hidden 取前4（取满即止），不足则补未隐藏的基础页
  var fixed4 = [];
  for (var oi = 0; oi < order.length && fixed4.length < 4; oi++) {
    var path = order[oi];
    if (hidden.indexOf(path) !== -1) continue;
    if (!getTabMeta(path)) continue;
    fixed4.push(path);
  }
  if (fixed4.length < 4) {
    TAB_PAGES.forEach(function (raw) {
      if (fixed4.indexOf(raw.pagePath) === -1 && hidden.indexOf(raw.pagePath) === -1) {
        fixed4.push(raw.pagePath);
      }
    });
  }

  // 第5位：解析 fifthPage
  //   基础页且不在前4 → 用它；额外页且允许入栏(navbarExtra) → 用它；否则兜底取剩余基础页
  var fifthItem = null;
  var fifthTab = getTabMeta(fifthPage);
  if (fifthTab && fixed4.indexOf(fifthPage) === -1) {
    fifthItem = tabItem(fifthTab);
  } else {
    var fifthExtra = getExtraMeta(fifthPage);
    if (fifthExtra && navbarExtra.indexOf(fifthPage) !== -1) {
      fifthItem = extraItem(fifthExtra);
    }
  }
  if (!fifthItem) {
    var rest = TAB_PAGES.filter(function (raw) {
      return fixed4.indexOf(raw.pagePath) === -1 && hidden.indexOf(raw.pagePath) === -1;
    });
    if (rest.length) fifthItem = tabItem(rest[0]);
  }

  var list = fixed4.map(function (p) { return tabItem(getTabMeta(p)); });
  if (fifthItem) list.push(fifthItem);

  return { list: list, theme: theme };
}

Component({
  data: {
    selected: 0,
    list: [],
    tabBarBg: '#FDF8F4',
    activeBg: '#F4B8B8'
  },

  lifetimes: {
    attached() {
      this.refreshBar();
    }
  },

  pageLifetimes: {
    show() {
      this.refreshBar();
    }
  },

  methods: {
    refreshBar() {
      var built = buildList();
      var pages = getCurrentPages();
      var route = pages.length ? pages[pages.length - 1].route : '';
      var idx = built.list.findIndex(function (item) {
        return item.pagePath === route;
      });
      this.setData({
        list: built.list,
        selected: idx >= 0 ? idx : 0,
        tabBarBg: built.theme.bg,
        activeBg: built.theme.activeBg
      });
    },

    onTap(e) {
      var index = e.currentTarget.dataset.index;
      var item = this.data.list[index];
      if (!item) return;
      if (item.isExtra) {
        // 额外页不在 tabBar.list 中，只能用 navigateTo 进入（该页本身不显示底部栏）
        wx.navigateTo({ url: '/' + item.pagePath });
      } else {
        wx.switchTab({ url: '/' + item.pagePath });
      }
    }
  }
});
