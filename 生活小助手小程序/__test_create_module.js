// 临时逻辑测试：新建板块类型选择、数值记录、打卡目标天数
const path = require('path');

// mock wx
const storage = {};
global.wx = {
  getStorageSync(k) { return storage[k] !== undefined ? storage[k] : ''; },
  setStorageSync(k, v) { storage[k] = v; },
  getSystemInfoSync() { return { windowWidth: 375 }; },
  getWindowInfo() { return { windowWidth: 375 }; },
  showToast() {},
  showModal() {},
  chooseMedia() {},
  getFileSystemManager() { return { saveFile() {} }; },
  env: { USER_DATA_PATH: '/tmp' },
  navigateTo() {},
  cloud: { database() { return { collection() { return {}; } }; } }
};
global.getApp = () => ({ globalData: { currentTheme: 'default' } });
global.getCurrentPages = () => [];
global.Page = (obj) => { global.__page = obj; };

const store = require('./utils/store');
const cloud = require('./utils/cloud');
const auth = require('./utils/auth');

// 覆盖 cloud 配置判断，避免未配置抛错
const origIsConfigured = cloud.isConfigured;
cloud.isConfigured = () => false;

// 先注册并登录一个测试账号
auth.register({ account: 'tester', password: '123456' });

require('./pages/index/index.js');
const page = global.__page;

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 初始化一个已登录用户
store.init('u_test');
let data = store.get();
data.lifeIndexData = [
  { id: 'todo', label: '今日待办', type: 'todo', bg: '#FFF3E0', hidden: false, data: [] },
  { id: 'checkin', label: '每日打卡', type: 'checkin', bg: '#E8F5E9', hidden: false, data: [] },
  { id: 'weight', label: '体重记录', type: 'weight', bg: '#F3E5F5', hidden: false, data: [] }
];
store.save();

// 测试 1：打开新建弹窗时应关闭管理弹窗
page.setData = function(obj) { Object.assign(this.data, obj); };
page.data.manageVisible = true;
page.openCreate();
assert(page.data.manageVisible === false, 'openCreate 应关闭管理弹窗');
assert(page.data.showCreateModal === true, 'openCreate 应打开新建弹窗');
assert(page.data.createStep === 'type', '初始应为类型选择步骤');

// 测试 2：选择数值记录类型
page.selectCreateType({ currentTarget: { dataset: { type: 'number' } } });
assert(page.data.createStep === 'config', '选择类型后进入配置步骤');
assert(page.data.createType === 'number', 'createType 应为 number');

// 测试 3：创建数值记录板块（单位 cm）
page.data.newModuleName = '身高记录';
page.data.createUnit = 'cm';
page.confirmCreate();
const li = store.get().lifeIndexData;
const numMod = li.find((m) => m.type === 'number');
assert(numMod, '应创建 number 类型模块');
assert(numMod.label === '身高记录', '模块名称正确');
assert(numMod.unit === 'cm', '模块单位应为 cm');

// 测试 4：打开数值模块并添加记录
page.openModule({ currentTarget: { dataset: { id: numMod.id } } });
assert(page.data.activeModuleType === 'number', '打开后类型为 number');
assert(page.data.numberUnit === 'cm', 'numberUnit 为 cm');
page.data.numberInput = '175.5';
page.data.numberNoteInput = '早晨空腹';
page.addNumber();
assert(numMod.data.length === 1, '应新增一条数值记录');
assert(numMod.data[0].value === 175.5, '数值正确');
assert(numMod.data[0].note === '早晨空腹', '备注正确');

// 测试 5：创建打卡模块
page.openCreate();
page.selectCreateType({ currentTarget: { dataset: { type: 'checkin' } } });
page.data.newModuleName = '健身打卡';
page.confirmCreate();
const checkinMod = store.get().lifeIndexData.find((m) => m.label === '健身打卡' && m.type === 'checkin');
assert(checkinMod, '应创建 checkin 模块');

// 测试 6：在打卡模块内新建打卡任务（总天数 21）
page.openModule({ currentTarget: { dataset: { id: checkinMod.id } } });
assert(page.data.activeModuleType === 'checkin', '打开后类型为 checkin');
page.data.checkinTaskName = '跑步';
page.data.checkinTotalDays = 21;
page.data.checkinCustomDays = '';
page.data.checkinEffectiveDays = 21;
page.confirmCheckinCreate();
const habit = checkinMod.data[0];
assert(habit.totalDays === 21, '新打卡任务总天数 21');
assert(Array.isArray(habit.checks) && habit.checks.length === 21, 'checks 长度 21');
assert(habit.checks.every((x) => x === false), '初始全部未完成');
// 模拟打卡第 0 天
page.toggleCheckinCell({ currentTarget: { dataset: { index: 0, cell: 0 } } });
page.refreshModal();
const rendered = page.data.checkinList[0];
assert(rendered.cells[0].checked === true, '第0格已打卡');
assert(rendered.doneCount === 1, '已完成 1 天');
assert(rendered.totalDays === 21, '渲染总天数 21');
assert(rendered.progress === Math.round((1 / 21) * 100), '进度 = 1/21');

// 测试 7：多个同类型模块可独立存在（多待办）
page.openCreate();
page.selectCreateType({ currentTarget: { dataset: { type: 'todo' } } });
page.data.newModuleName = '购物清单';
page.confirmCreate();
const todos = store.get().lifeIndexData.filter((m) => m.type === 'todo');
assert(todos.length === 2, '应存在两个 todo 模块');

// 测试 8：待办模块独立写入不串数据
page.openModule({ currentTarget: { dataset: { id: todos[1].id } } });
page.data.todoInput = '买牛奶';
page.addTodo();
assert(todos[1].data.length === 1, '新 todo 模块有 1 条');
assert(todos[0].data.length === 0, '原 todo 模块未被污染');

if (page._syncTimer) clearTimeout(page._syncTimer);
cloud.isConfigured = origIsConfigured;
console.log('全部测试通过 ✅');
