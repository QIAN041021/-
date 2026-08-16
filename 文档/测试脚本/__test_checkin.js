// 临时逻辑测试：验证「打卡任务」新模型逻辑
// 1) utils/util.js lastNDays(n)
// 2) pages/index/index.js: refreshModal(打卡) / toggleCheckinCell / confirmCheckinCreate / computeModules(打卡预览)

const storage = {};
global.wx = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = v; },
  removeStorageSync: (k) => { delete storage[k]; },
  getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
  getSystemInfoSync: () => ({ windowWidth: 375, statusBarHeight: 20 }),
  showToast: () => {},
  showModal: () => {},
  navigateTo: () => {},
  cloud: { init: () => {}, callFunction: () => Promise.resolve({ result: {} }), database: () => ({ collection: () => ({ doc: () => ({ set: () => Promise.resolve({}), get: () => Promise.resolve({ data: null }), update: () => Promise.resolve({}) }) }) }) }
};
let capturedPage = null;
global.Page = (obj) => { capturedPage = obj; };
global.getApp = () => ({ globalData: { currentTheme: 'default', userId: 'u_test', account: '测试' } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function assert(cond, msg) {
  if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
  else console.log('✅', msg);
}

(async () => {
  // ========== 1) lastNDays ==========
  const util = require('./utils/util');
  const win = util.lastNDays(30);
  assert(Array.isArray(win) && win.length === 30, 'lastNDays(30): 返回 30 天');
  assert(win[29].isToday === true, 'lastNDays: 最后一天是今天');
  assert(win[0].isToday === false, 'lastNDays: 第一天不是今天');
  const expectedFirst = util.ymd((() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 29); return d; })());
  assert(win[0].date === expectedFirst, 'lastNDays: 第一天是 29 天前');
  assert(win.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date)), 'lastNDays: 所有 date 为 YYYY-MM-DD');
  assert(win.every((x) => typeof x.day === 'number' && typeof x.weekday === 'string'), 'lastNDays: 含 day/weekday 字段');

  // ========== 2) 页面打卡交互（新模型）==========
  const store = require('./utils/store');
  const USER = 'u_test';
  store.init(USER);
  const data = store.get();
  const checkinMod = {
    id: 'checkin_test', label: '喝水', type: 'checkin', bg: '#E8F5E9', hidden: false,
    data: [{ name: '喝水8杯', totalDays: 21, checks: new Array(21).fill(false) }]
  };
  data.lifeIndexData.push(checkinMod);
  store.save();
  wx.setStorageSync('lifeapp_session', { userId: USER, account: '测试' });

  // 绕过 requireLogin 守卫
  const auth = require('./utils/auth');
  const origRequireLogin = auth.requireLogin;
  auth.requireLogin = () => true;

  require('./pages/index/index.js');
  const page = Object.assign(Object.create(null), capturedPage);
  page.data = JSON.parse(JSON.stringify(capturedPage.data));
  page.setData = function (patch) { Object.assign(this.data, patch); };
  page.getTabBar = () => null;

  // refreshModal 构建 N 格网格
  page.data.activeModule = 'checkin_test';
  page.data.activeModuleType = 'checkin';
  page.refreshModal();
  const c0 = page.data.checkinList[0];
  assert(c0.cells.length === 21, 'refreshModal(打卡): 构建 21 格网格（=总天数）');
  assert(c0.doneCount === 0, 'refreshModal(打卡): 初始已完成 0');
  assert(c0.progress === 0, 'refreshModal(打卡): 进度 0%');
  assert(c0.totalDays === 21, 'refreshModal(打卡): 总天数 21');

  // toggleCheckinCell：点击第 0 格 -> 打卡
  page.toggleCheckinCell({ currentTarget: { dataset: { index: 0, cell: 0 } } });
  await sleep(10);
  assert(checkinMod.data[0].checks[0] === true, 'toggleCheckinCell: 点击后第0格写入 true');
  // 再次点击同一格 -> 单日仅可打卡一次，不变化
  page.toggleCheckinCell({ currentTarget: { dataset: { index: 0, cell: 0 } } });
  await sleep(10);
  assert(checkinMod.data[0].checks[0] === true, 'toggleCheckinCell: 再次点击同一格仍为 true（不可重复）');
  assert(checkinMod.data[0].checks.filter(Boolean).length === 1, 'toggleCheckinCell: 已完成仍仅 1 天');

  // 刷新后 doneCount / progress 反映
  page.refreshModal();
  assert(page.data.checkinList[0].doneCount === 1, 'refreshModal: doneCount = 1');
  assert(page.data.checkinList[0].progress === Math.round((1/21)*100), 'refreshModal: 进度 = 1/21');

  // confirmCheckinCreate：新建一个 30 天任务
  page.data.activeModule = 'checkin_test';
  page.data.activeModuleType = 'checkin';
  page.data.checkinTaskName = '跑步';
  page.data.checkinTotalDays = 30;
  page.data.checkinCustomDays = '';
  page.data.checkinEffectiveDays = 30;
  page.confirmCheckinCreate();
  await sleep(10);
  const newTask = checkinMod.data[1];
  assert(newTask && newTask.name === '跑步', 'confirmCheckinCreate: 新任务名为「跑步」');
  assert(newTask.totalDays === 30, 'confirmCheckinCreate: 总天数为 30');
  assert(Array.isArray(newTask.checks) && newTask.checks.length === 30, 'confirmCheckinCreate: checks 长度 30');
  assert(newTask.checks.every((x) => x === false), 'confirmCheckinCreate: 初始全部未完成');

  // 自定义天数：输入 100
  page.data.checkinTaskName = '百天挑战';
  page.data.checkinTotalDays = 21;
  page.data.checkinCustomDays = '100';
  page.data.checkinEffectiveDays = 100;
  page.confirmCheckinCreate();
  await sleep(10);
  const cTask = checkinMod.data[2];
  assert(cTask.totalDays === 100 && cTask.checks.length === 100, 'confirmCheckinCreate: 自定义 100 天生效');

  // computeModules 预览：已完成 X/Y 天
  page.refresh();
  const mod = page.data.modules.find((m) => m.id === 'checkin_test');
  assert(/已完成 \d+\/\d+ 天/.test(mod.preview), 'computeModules: 预览为「已完成 X/Y 天」');

  // 旧数据迁移：history/targetDays -> checks
  const legacyMod = {
    id: 'checkin_legacy', label: '旧数据', type: 'checkin', bg: '#E8F5E9', hidden: false,
    data: [{ name: '老习惯', history: ['2026-01-01'], targetDays: 7 }]
  };
  data.lifeIndexData.push(legacyMod);
  store.save();
  page.data.activeModule = 'checkin_legacy';
  page.refreshModal();
  const lm = page.data.checkinList[0];
  assert(Array.isArray(lm.cells) && lm.cells.length === 7, '迁移: 旧 targetDays=7 -> 7 格');
  assert(lm.cells.every((x) => x.checked === false), '迁移: 旧 history 不带入新勾选（重置）');

  auth.requireLogin = origRequireLogin;
  console.log('\n打卡任务新模型逻辑测试完成。');
})();
