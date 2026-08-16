/**
 * 全局主题管理器
 * 负责：读取/切换/应用主题，同步 CSS 变量、导航栏、TabBar
 */
var THEME_CONFIG = {
  default: { label: '暖粉', bg: '#FDF8F4', primary: '#F4B8B8', accent: '#B0D9B1', primaryRgb: '244,184,184' },
  warm:    { label: '暖橙', bg: '#FFF8F0', primary: '#FF8A65', accent: '#FFCC80', primaryRgb: '255,138,101' },
  cool:    { label: '清凉蓝', bg: '#F0F7FA', primary: '#4FC3F7', accent: '#80CBC4', primaryRgb: '79,195,247' },
  fresh:   { label: '清新绿', bg: '#F2F8EB', primary: '#9FD49A', accent: '#C2E6BC', primaryRgb: '159,212,154' },
  purple:  { label: '优雅紫', bg: '#F8F4FC', primary: '#AB47BC', accent: '#CE93D8', primaryRgb: '171,71,188' }
};

var TAB_THEMES = {
  default: { bg: '#FDF8F4', inactive: '#C88E8E', active: '#F4B8B8', activeBg: '#F4B8B8' },
  warm:    { bg: '#FFF8F0', inactive: '#BCAAA4', active: '#FF8A65', activeBg: '#FF8A65' },
  cool:    { bg: '#F0F7FA', inactive: '#90A4AE', active: '#4FC3F7', activeBg: '#4FC3F7' },
  fresh:   { bg: '#F2F8EB', inactive: '#A9C89C', active: '#9FD49A', activeBg: '#9FD49A' },
  purple:  { bg: '#F8F4FC', inactive: '#B39DDB', active: '#AB47BC', activeBg: '#AB47BC' }
};

/**
 * 获取当前主题名（从 store 或 fallback）
 */
function getCurrentThemeName() {
  try {
    var store = require('./store');
    var data = store.get();
    if (data && data.settings && data.settings.theme) {
      return data.settings.theme;
    }
  } catch (e) { /* store 尚未初始化 */ }
  return 'default';
}

/**
 * 获取主题配置
 */
function getTheme(themeName) {
  return THEME_CONFIG[themeName] || THEME_CONFIG['default'];
}

/**
 * 获取 TabBar 主题配置
 */
function getTabTheme(themeName) {
  return TAB_THEMES[themeName] || TAB_THEMES['default'];
}

/**
 * 应用主题到导航栏
 */
function applyNavigationBar(themeName) {
  var theme = getTheme(themeName);
  wx.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: theme.bg,
    animation: { duration: 300, timingFunc: 'easeInOut' }
  });
}

/**
 * 应用主题到所有活跃页面 - 通过 setData 同步 themeClass
 * 页面的根 view 需要绑定 class="screen theme-{{themeClass}}"
 */
function syncActivePages(themeName) {
  var pages = getCurrentPages();
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    if (page.setData) {
      page.setData({ themeClass: themeName });
    }
  }
}

/**
 * 完整应用主题（导航栏 + TabBar + 所有页面）
 */
function apply(themeName) {
  themeName = themeName || getCurrentThemeName();
  var app = getApp();
  if (app && app.globalData) app.globalData.currentTheme = themeName;
  applyNavigationBar(themeName);
  syncActivePages(themeName);
  return themeName;
}

/**
 * 获取所有可用主题列表
 */
function getThemeList() {
  return [
    { name: 'default', label: '暖粉', bg: '#FDF8F4', primary: '#F4B8B8', accent: '#B0D9B1' },
    { name: 'warm',    label: '暖橙', bg: '#FFF8F0', primary: '#FF8A65', accent: '#FFCC80' },
    { name: 'cool',    label: '清凉蓝', bg: '#F0F7FA', primary: '#4FC3F7', accent: '#80CBC4' },
    { name: 'fresh',   label: '清新绿', bg: '#F2F8EB', primary: '#9FD49A', accent: '#C2E6BC' },
    { name: 'purple',  label: '优雅紫', bg: '#F8F4FC', primary: '#AB47BC', accent: '#CE93D8' }
  ];
}

/**
 * 字号档位（滑块刻度 → 缩放系数）
 */
var FONT_SCALE_OPTIONS = [
  { value: 0.85, label: '小' },
  { value: 1, label: '标准' },
  { value: 1.15, label: '大' },
  { value: 1.3, label: '特大' }
];

/**
 * 字重档位
 */
var FONT_WEIGHT_OPTIONS = [
  { value: '400', label: '常规' },
  { value: '600', label: '中粗' },
  { value: '700', label: '加粗' }
];

/**
 * 从 store 读取当前字体设置（带兜底）
 */
function getFontSettings() {
  var scale = 1;
  var weight = '400';
  try {
    var store = require('./store');
    var data = store.get();
    if (data && data.settings) {
      if (typeof data.settings.fontScale === 'number') scale = data.settings.fontScale;
      if (data.settings.fontWeight) weight = String(data.settings.fontWeight);
    }
  } catch (e) { /* store 尚未初始化 */ }
  return { scale: scale, weight: weight };
}

/**
 * 把字体设置注入页面 data，供 .screen 的 inline style 绑定使用
 */
function applyFont(page) {
  if (!page || !page.setData) return;
  var f = getFontSettings();
  page.setData({ appFontScale: f.scale, appFontWeight: f.weight });
}

function getFontScaleOptions() {
  return FONT_SCALE_OPTIONS.slice();
}

function getFontWeightOptions() {
  return FONT_WEIGHT_OPTIONS.slice();
}

module.exports = {
  getCurrentThemeName: getCurrentThemeName,
  getTheme: getTheme,
  getTabTheme: getTabTheme,
  apply: apply,
  applyNavigationBar: applyNavigationBar,
  syncActivePages: syncActivePages,
  getThemeList: getThemeList,
  getFontSettings: getFontSettings,
  applyFont: applyFont,
  getFontScaleOptions: getFontScaleOptions,
  getFontWeightOptions: getFontWeightOptions
};
