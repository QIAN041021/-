// utils/pages-registry.js - 全站页面元数据单一来源
// 供 custom-tab-bar（底部栏图标/名称）与 nav-drawer（侧边栏列表）共用，
// 新增页面只需在此登记一处，底部栏动态第5位与侧边栏自动支持。

function icon(paths, color) {
  var s =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">' +
    paths.split('COLOR').join(color) +
    '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(s);
}

// ===== 基础 tab 页（在 app.json tabBar.list 中，可用 switchTab 切换）=====
var HOME =
  '<path d="M2 8L9 2L16 8V15C16 15.5 15.5 16 15 16H11V11H7V16H3C2.5 16 2 15.5 2 15V8Z" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round"/>';
var ACCOUNT =
  '<rect x="3" y="2" width="12" height="14" rx="3" fill="none" stroke="COLOR" stroke-width="1.5"/><path d="M6 6H12M6 9H12M6 12H9" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/>';
var RECIPE =
  '<path d="M3 8H15V13C15 14.5 13.5 16 12 16H6C4.5 16 3 14.5 3 13V8Z" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.5 8H16.5" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/><path d="M6.5 5C6.5 4 7 3 8 3M11 5C11 4 11.5 3 12.5 3" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/>';
var SUPPLY =
  '<rect x="6" y="6" width="6" height="10" rx="1" fill="none" stroke="COLOR" stroke-width="1.5"/><path d="M7 6V4H11V6" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 9V13" stroke="COLOR" stroke-width="1.5" stroke-linecap="round"/>';
var PICKUP =
  '<path d="M3 6H13V14H3V6Z" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 9H16L17 11V14H13V9Z" fill="none" stroke="COLOR" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="14.5" r="1.4" fill="none" stroke="COLOR" stroke-width="1.3"/><circle cx="14.5" cy="14.5" r="1.4" fill="none" stroke="COLOR" stroke-width="1.3"/><path d="M6 9H10" stroke="COLOR" stroke-width="1.3" stroke-linecap="round"/>';

var TAB_PAGES = [
  { pagePath: 'pages/index/index',     text: '首页',   paths: HOME },
  { pagePath: 'pages/account/account', text: '记账',   paths: ACCOUNT },
  { pagePath: 'pages/recipe/recipe',   text: '菜谱',   paths: RECIPE },
  { pagePath: 'pages/supply/supply',   text: '进度条', paths: SUPPLY },
  { pagePath: 'pages/pickup/pickup',   text: '取件码', paths: PICKUP }
];

// ===== 额外页（不在 tabBar.list，走 navigateTo；可占底部栏第5动态位）=====
// inNavbar: 默认是否允许占据第5位（用户可在设置里改 navbarExtra 覆盖）。
// 图标用 SVG（与 tab 页风格统一，底部栏第5位复用 <image> 渲染）。
var MEDICINE =
  '<rect x="5.5" y="3" width="7" height="12" rx="3.5" fill="none" stroke="COLOR" stroke-width="1.5"/><path d="M5.5 9H12.5" stroke="COLOR" stroke-width="1.5"/><path d="M8.5 5.2V6.8M7.7 6H9.3" stroke="COLOR" stroke-width="1.2" stroke-linecap="round"/>';
// 通用占位图标（未来新增页若未自定义图标时使用）
var GENERIC =
  '<rect x="4" y="3" width="10" height="12" rx="2" fill="none" stroke="COLOR" stroke-width="1.5"/><path d="M6.5 6.5H11.5M6.5 9H11.5M6.5 11.5H9.5" stroke="COLOR" stroke-width="1.3" stroke-linecap="round"/>';

var EXTRA_PAGES = [
  { pagePath: 'pages/medication/medication', text: '药物记录', paths: MEDICINE, inNavbar: true,  icon: '💊' },
  { pagePath: 'pages/settings/settings',     text: '设置',     paths: GENERIC,  inNavbar: false, icon: '⚙️' }
];

// 侧边栏用的完整列表（顺序即展示顺序）
var ALL_NAV_PAGES = TAB_PAGES.map(function (p) {
  return { key: p.pagePath.split('/')[1], text: p.text, path: p.pagePath, isTab: true, icon: '•' };
}).concat(EXTRA_PAGES.map(function (p) {
  return { key: p.pagePath.split('/')[1], text: p.text, path: p.pagePath, isTab: false, icon: p.icon };
}));

// 默认第5动态位（保持初始5页现状：取件码在末位）
var DEFAULT_FIFTH = 'pages/pickup/pickup';

function getTabMeta(path) {
  return TAB_PAGES.find(function (p) { return p.pagePath === path; }) || null;
}

function getExtraMeta(path) {
  return EXTRA_PAGES.find(function (p) { return p.pagePath === path; }) || null;
}

function getPageMeta(path) {
  return getTabMeta(path) || getExtraMeta(path);
}

// 生成某页的底部栏图标 dataURI（tab 页与额外页统一走 SVG）
function buildIcon(path, color) {
  var meta = getPageMeta(path);
  if (meta && meta.paths) return icon(meta.paths, color);
  return icon(GENERIC, color);
}

function textOf(path) {
  var meta = getPageMeta(path);
  return meta ? meta.text : path;
}

module.exports = {
  TAB_PAGES: TAB_PAGES,
  EXTRA_PAGES: EXTRA_PAGES,
  ALL_NAV_PAGES: ALL_NAV_PAGES,
  DEFAULT_FIFTH: DEFAULT_FIFTH,
  getTabMeta: getTabMeta,
  getExtraMeta: getExtraMeta,
  getPageMeta: getPageMeta,
  buildIcon: buildIcon,
  textOf: textOf
};
