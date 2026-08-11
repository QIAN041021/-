// 临时逻辑测试：mock wx 存储 + 云数据库，验证首页板块管理 + 云同步
const fs = require('fs');
const path = require('path');

// ---- mock wx ----
const storage = {};
let cloudSetCapture = null;
let cloudGetResult = null;

global.wx = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = typeof v === 'string' ? v : JSON.stringify(v); },
  removeStorageSync: (k) => { delete storage[k]; },
  cloud: {
    database: () => ({
      collection: () => ({
        doc: () => ({
          set: ({ data }) => { cloudSetCapture = data; return Promise.resolve({}); },
          get: () => Promise.resolve(cloudGetResult ? { data: cloudGetResult } : null)
        })
      })
    })
  }
};

const store = require('./utils/store');
const cloud = require('./utils/cloud');

function assert(cond, msg) {
  if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
  else console.log('✅', msg);
}

// 初始化用户数据
const USER = 'u_test';
store.init(USER);
let data = store.get();

// 1. 默认模块带 type / hidden
assert(data.lifeIndexData.length === 4, '默认 4 个模块');
assert(data.lifeIndexData.every(m => m.type && m.hidden === false), '模块含 type 且 hidden=false');

// 2. 新建自定义板块
data.lifeIndexData.push({ id: 'custom_x', label: '读书', type: 'custom', bg: '#FFF8F0', hidden: false, data: [] });
store.save();
data = store.get();
assert(data.lifeIndexData.length === 5, '新建后 5 个模块');

// 模拟 computeModules 的过滤逻辑（直接引用页面算法不易 require，这里复刻核心过滤）
function visibleLabels() {
  return data.lifeIndexData.filter(m => !m.hidden).map(m => m.label);
}
assert(visibleLabels().indexOf('读书') >= 0, '自定义板块默认可见');

// 3. 隐藏内置板块
data.lifeIndexData.find(m => m.id === 'todo').hidden = true;
assert(visibleLabels().indexOf('今日待办') < 0, '隐藏后不再展示');

// 4. 重排序（数组顺序即展示顺序）
data.lifeIndexData.sort((a, b) => {
  const order = ['weight', 'task', 'checkin', 'custom_x', 'todo'];
  return order.indexOf(a.id) - order.indexOf(b.id);
});
const firstId = data.lifeIndexData[0].id;
assert(firstId === 'weight', '重排序后首个为 weight, 实际=' + firstId);

// 5. 重命名
data.lifeIndexData.find(m => m.id === 'checkin').label = '我的打卡';
assert(data.lifeIndexData.find(m => m.id === 'checkin').label === '我的打卡', '重命名生效');

// 6. 删除自定义板块
const idx = data.lifeIndexData.findIndex(m => m.id === 'custom_x');
data.lifeIndexData.splice(idx, 1);
assert(data.lifeIndexData.length === 4, '删除自定义板块后回到 4 个');

// 7. 云同步：写入应包含 modules + updatedAt
data.lifeIndexUpdatedAt = Date.now();
cloud.syncLifeIndex(USER, data.lifeIndexData).then((ok) => {
  assert(ok === true, '云 syncLifeIndex 返回 true');
  assert(cloudSetCapture && Array.isArray(cloudSetCapture.modules), '云文档含 modules 数组');
  assert(cloudSetCapture.modules.length === 4, '云文档 modules 数量=4');
  assert(typeof cloudSetCapture.updatedAt === 'number', '云文档含 updatedAt 时间戳');

  // 8. 云拉取：云端更新时间更新则采用
  cloudGetResult = { modules: [{ id: 'todo', label: '云端待办', type: 'todo', bg: '#fff', hidden: false, data: [] }], updatedAt: Date.now() + 100000 };
  const local = store.get();
  local.lifeIndexUpdatedAt = 100; // 本地较旧
  return cloud.fetchLifeIndex(USER).then((doc) => {
    assert(doc && doc.modules[0].label === '云端待办', 'fetchLifeIndex 返回云端文档');
    if ((doc.updatedAt || 0) > (local.lifeIndexUpdatedAt || 0)) {
      local.lifeIndexData = doc.modules;
      assert(local.lifeIndexData[0].label === '云端待办', 'pullLifeIndex 采用云端（LWW）');
    }
  });
}).then(() => {
  // 9. 降级：wx.cloud 未初始化时 sync 安全返回 false（不抛错）
  cloudGetResult = null;
  const origCloud = global.wx.cloud;
  global.wx.cloud = null;
  return cloud.syncLifeIndex(USER, []).then((r) => {
    assert(r === false, 'wx.cloud 未初始化时 sync 安全返回 false');
    global.wx.cloud = origCloud;
  });
}).then(() => {
  console.log('\n全部逻辑测试完成。');
}).catch((e) => { console.error('测试异常', e); process.exitCode = 1; });
