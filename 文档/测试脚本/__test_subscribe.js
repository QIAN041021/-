// 临时逻辑测试：验证「任务到期微信提醒（订阅消息）」相关逻辑
// 1) utils/subscribe.js 单元行为
// 2) pages/index/index.js 中 toggleTaskRemind 的开关逻辑（需模板ID/需截止日/正常订阅）

// ---------- mock wx ----------
const storage = {};
let toasts = [];
let subShouldFail = false;

global.wx = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = v; },
  removeStorageSync: (k) => { delete storage[k]; },
  getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
  getSystemInfoSync: () => ({ windowWidth: 375, statusBarHeight: 20 }),
  showToast: (o) => { toasts.push(o); },
  showModal: () => {},
  navigateTo: () => {},
  requestSubscribeMessage: ({ tmplIds, success, fail }) => {
    if (subShouldFail) { fail && fail({ errMsg: 'user deny' }); return; }
    success({ [tmplIds[0]]: 'accept' });
  },
  cloud: {
    init: () => {},
    callFunction: ({ name }) =>
      name === 'getOpenid'
        ? Promise.resolve({ result: { openid: 'openid_test' } })
        : Promise.resolve({ result: {} }),
    database: () => ({
      collection: () => ({
        doc: () => ({
          set: () => Promise.resolve({}),
          get: () => Promise.resolve({ data: null }),
          update: () => Promise.resolve({})
        })
      })
    })
  }
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
  // ========== 1) utils/subscribe.js 单元测试 ==========
  const subscribe = require('./utils/subscribe');

  // isAvailable
  assert(subscribe.isAvailable() === true, 'isAvailable: 有 requestSubscribeMessage 时可用');
  const origReq = global.wx.requestSubscribeMessage;
  global.wx.requestSubscribeMessage = undefined;
  assert(subscribe.isAvailable() === false, 'isAvailable: 无 API 时不可用');
  global.wx.requestSubscribeMessage = origReq;

  // truncate
  assert(subscribe.truncate('abcdefghijklmnopqrst', 20) === 'abcdefghijklmnopqrst', 'truncate: 不超长不截断');
  assert(subscribe.truncate('abcdefghijklmnopqrstu', 20) === 'abcdefghijklmnopqrst', 'truncate: 超长截断到20');

  // requestTaskReminder: 未配置模板 -> false
  subscribe.setTemplateId('');
  const r1 = await subscribe.requestTaskReminder();
  assert(r1 === false, 'requestTaskReminder: 未配置模板返回 false');

  // requestTaskReminder: 配置模板且用户同意 -> true
  subscribe.setTemplateId('tmpl_test');
  const r2 = await subscribe.requestTaskReminder();
  assert(r2 === true, 'requestTaskReminder: 用户同意返回 true');

  // requestTaskReminder: 用户拒绝 -> false
  subShouldFail = true;
  const r3 = await subscribe.requestTaskReminder();
  assert(r3 === false, 'requestTaskReminder: 用户拒绝返回 false');
  subShouldFail = false;

  // getOpenid 缓存
  subscribe.setTemplateId('tmpl_test');
  const o1 = await subscribe.getOpenid();
  assert(o1 === 'openid_test', 'getOpenid: 返回 openid');
  assert(storage[subscribe.OPENID_KEY] === 'openid_test', 'getOpenid: openid 已缓存到本地');
  const o2 = await subscribe.getOpenid();
  assert(o2 === 'openid_test', 'getOpenid: 二次调用命中缓存');

  // ========== 2) 页面 toggleTaskRemind 集成测试 ==========
  const store = require('./utils/store');
  const USER = 'u_test';
  store.init(USER);
  const data = store.get();
  const taskMod = data.lifeIndexData.find((m) => m.id === 'task');
  // 两个任务：task0 无截止日（测"需截止日"守卫），task1 有截止日（测正常订阅 + 配置守卫）
  taskMod.data = [
    { text: '无截止日任务', priority: 'low', deadline: '', done: false },
    { text: '写周报', priority: 'high', deadline: '2030-01-01', done: false }
  ];
  store.save();
  wx.setStorageSync('lifeapp_session', { userId: USER, account: '测试' });

  require('./pages/index/index.js');
  const page = Object.assign(Object.create(null), capturedPage);
  page.data = JSON.parse(JSON.stringify(capturedPage.data));
  page.setData = function (patch) { Object.assign(this.data, patch); };
  page.getTabBar = () => null;

  // 场景 A：未配置模板 ID -> 提示配置，remind 不变
  toasts = [];
  subscribe.setTemplateId('');
  page.data.activeModule = 'task';
  page.data.activeModuleType = 'task';
  page.toggleTaskRemind({ currentTarget: { dataset: { index: 1 } } });
  await sleep(20);
  assert(taskMod.data[1].remind !== true, '场景A: 未配置模板时 remind 仍为 false');
  assert(toasts.some((t) => /配置订阅消息模板/.test(t.title)), '场景A: 提示"请在后台配置订阅消息模板"');

  // 场景 B：配置模板，但任务无截止日 -> 提示设置截止日
  toasts = [];
  subscribe.setTemplateId('tmpl_test');
  page.toggleTaskRemind({ currentTarget: { dataset: { index: 0 } } });
  await sleep(20);
  assert(taskMod.data[0].remind !== true, '场景B: 无截止日时 remind 仍为 false');
  assert(toasts.some((t) => /截止日/.test(t.title)), '场景B: 提示"请先设置截止日"');

  // 场景 C：配置模板 + 有截止日 + 用户同意 -> 写入 remind/openid/reminded
  toasts = [];
  page.toggleTaskRemind({ currentTarget: { dataset: { index: 1 } } });
  await sleep(20);
  assert(taskMod.data[1].remind === true, '场景C: 订阅成功 remind=true');
  assert(taskMod.data[1].openid === 'openid_test', '场景C: 已记录 openid 供云函数推送');
  assert(taskMod.data[1].reminded === false, '场景C: 尚未推送 reminded=false');
  assert(toasts.some((t) => /已开启到期提醒/.test(t.title)), '场景C: 提示"已开启到期提醒"');
  assert(typeof data.lifeIndexUpdatedAt === 'number', '场景C: 已触发本地持久化（updatedAt 写入）');

  // 场景 D：再次点击 -> 关闭提醒
  toasts = [];
  page.toggleTaskRemind({ currentTarget: { dataset: { index: 1 } } });
  await sleep(20);
  assert(taskMod.data[1].remind === false, '场景D: 再次点击关闭提醒');

  console.log('\n订阅消息逻辑测试完成。');
})();
