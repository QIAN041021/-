// 字体设置逻辑测试：theme.js 的 getFontSettings / applyFont / getFontScaleOptions / getFontWeightOptions
// 运行：node __test_font.js

// --- 最小化 wx 与 store 桩，便于 theme.js 内部 require('./store') 正常初始化 ---
global.wx = {
  getStorageSync: function () { return ''; },
  setStorageSync: function () {}
};

var assert = require('assert');
var theme = require('./utils/theme');
var store = require('./utils/store');

var passed = 0;
function ok(name, cond) {
  assert.ok(cond, '断言失败: ' + name);
  passed++;
  console.log('  ✓ ' + name);
}

// 1. 档位选项结构
var scales = theme.getFontScaleOptions();
var weights = theme.getFontWeightOptions();
ok('字号档位共 4 档', scales.length === 4);
ok('字号最小档为 0.85(小)', scales[0].value === 0.85 && scales[0].label === '小');
ok('字号最大档为 1.3(特大)', scales[3].value === 1.3 && scales[3].label === '特大');
ok('字重档位共 3 档', weights.length === 3);
ok('字重含 400/600/700', weights.map(function (w) { return w.value; }).join(',') === '400,600,700');

// 2. store 未初始化时返回兜底值
var def = theme.getFontSettings();
ok('未初始化返回 scale=1', def.scale === 1);
ok('未初始化返回 weight=400', def.weight === '400');

// 3. 初始化 store 后，默认值应来自 defaultData（fontScale=1, fontWeight='400'）
store.init('test_user_font');
var d1 = theme.getFontSettings();
ok('初始化后默认 fontScale=1', d1.scale === 1);
ok('初始化后默认 fontWeight=400', d1.weight === '400');

// 4. 写入自定义设置后，getFontSettings 正确读取；applyFont 注入页面 data
store.get().settings.fontScale = 1.3;
store.get().settings.fontWeight = '700';
var d2 = theme.getFontSettings();
ok('自定义 fontScale 被读取(1.3)', d2.scale === 1.3);
ok('自定义 fontWeight 被读取(700)', d2.weight === '700');

var fakePage = { setData: function (patch) { this._patch = patch; } };
theme.applyFont(fakePage);
ok('applyFont 注入 appFontScale', fakePage._patch.appFontScale === 1.3);
ok('applyFont 注入 appFontWeight', fakePage._patch.appFontWeight === '700');

// 5. 兼容性：旧数据缺少 fontScale/fontWeight 时应被补默认（不崩溃）
store.get().settings.fontScale = undefined;
store.get().settings.fontWeight = undefined;
var d3 = theme.getFontSettings();
ok('缺字段时兜底 scale=1', d3.scale === 1);
ok('缺字段时兜底 weight=400', d3.weight === '400');

console.log('\n字体设置测试通过：' + passed + ' 项断言全部成功 ✅');
