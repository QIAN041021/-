// utils/nav-drawer.js - 侧栏抽屉导航工具
// 提供全部可导航页面列表、抽屉页面数据生成，以及在各页面注入手势/按钮处理方法。
// 使用方式：在页面 js 的 onLoad 中调用 navDrawer.attach(this)；在 wxml 中引入 <drawer> 组件并绑定事件。

var reg = require('./pages-registry');
var store = require('./store');

// 全部可导航的功能页面（顺序即侧边栏展示顺序）。isTab 标记是否在底部 tabBar 中。
// 数据来自 pages-registry 单一来源（含未来新增页），避免与底部栏定义脱节。
var ALL_NAV_PAGES = reg.ALL_NAV_PAGES;

function getCurrentRoute() {
  try {
    var pages = getCurrentPages();
    return pages.length ? pages[pages.length - 1].route : '';
  } catch (e) {
    return '';
  }
}

function getDrawerPages(currentRoute) {
  var route = currentRoute || getCurrentRoute();
  return ALL_NAV_PAGES.map(function (p) {
    return {
      key: p.key,
      text: p.text,
      path: p.path,
      isTab: p.isTab,
      active: route === p.path
    };
  });
}

// 把抽屉相关方法和初始数据挂到某个 Page 实例上。
function attach(page) {
  var route = getCurrentRoute();
  page.setData({
    drawerShow: false,
    drawerPages: getDrawerPages(route),
    drawerRoute: route
  });

  page.openDrawer = function () {
    var r = getCurrentRoute();
    page.setData({
      drawerShow: true,
      drawerPages: getDrawerPages(r),
      drawerRoute: r
    });
  };

  page.closeDrawer = function () {
    page.setData({ drawerShow: false });
  };

  page.onHamburgerTap = function () {
    page.openDrawer();
  };

  // 边缘右滑打开：touchstart 记录起始坐标；touchmove 若从左边缘(<=30px)开始、
  // 向右滑动超过 60px 且纵向偏移不大，则打开抽屉（仅在关闭状态下触发）。
  page._edgeStartX = 0;
  page._edgeStartY = 0;

  page.onEdgeTouchStart = function (e) {
    try {
      var t = e.touches[0];
      page._edgeStartX = t.clientX;
      page._edgeStartY = t.clientY;
    } catch (err) {}
  };

  page.onEdgeTouchMove = function (e) {
    if (page.data.drawerShow) return;
    try {
      var t = e.touches[0];
      var dx = t.clientX - page._edgeStartX;
      var dy = t.clientY - page._edgeStartY;
      if (page._edgeStartX <= 30 && dx > 60 && Math.abs(dy) < 80) {
        page.openDrawer();
      }
    } catch (err) {}
  };

  // 抽屉点击某页：关闭抽屉后跳转。tab 页用 switchTab，非 tab 页用 navigateTo/redirectTo。
  page.onDrawerNavigate = function (e) {
    var item = e.detail.item;
    page.closeDrawer();
    if (!item) return;
    if (item.isTab) {
      wx.switchTab({ url: '/' + item.path });
      return;
    }
    var cur = page.data.drawerRoute || '';
    var curIsNonTab = ALL_NAV_PAGES.some(function (p) {
      return p.path === cur && !p.isTab;
    });
    if (curIsNonTab && cur !== item.path) {
      // 当前已在非 tab 页，跳另一个非 tab 页用 redirectTo 避免栈过深
      wx.redirectTo({ url: '/' + item.path });
    } else {
      wx.navigateTo({ url: '/' + item.path });
    }
    // 若该额外页被允许入底部栏（在 navbarExtra 中），则写入第五动态位：
    // 实现“用户从侧边栏跳到哪个页面，哪个页面就占底部栏第5位”。
    try {
      var data = store.get();
      if (data && data.settings) {
        var navbarExtra = data.settings.navbarExtra || [];
        if (navbarExtra.indexOf(item.path) !== -1 && data.settings.fifthPage !== item.path) {
          data.settings.fifthPage = item.path;
          store.save();
        }
      }
    } catch (err) {}
  };

  page.onDrawerClose = function () {
    page.closeDrawer();
  };
}

module.exports = {
  ALL_NAV_PAGES: ALL_NAV_PAGES,
  getDrawerPages: getDrawerPages,
  attach: attach
};
