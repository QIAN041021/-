// 取件码页面逻辑验证：mock wx / auth / getApp / Page，跑通分类与取件码核心流程
const fs = require('fs');
const path = require('path');

// ---- mock wx 存储 + 弹窗 ----
const storage = {};
let toastMsg = '';
global.wx = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = typeof v === 'string' ? v : JSON.stringify(v); },
  showToast: (o) => { toastMsg = (o && o.title) || ''; },
  showModal: (o) => { if (o && o.success) o.success({ confirm: true }); },
  cloud: null
};
storage['lifeapp_session'] = JSON.stringify({ userId: 'u_test', account: 'tester' });

global.getApp = () => ({ globalData: { currentTheme: 'default' } });
global.getCurrentPages = () => [];

let pageConfig = null;
global.Page = (cfg) => { pageConfig = cfg; };

// ---- 载入真实模块 ----
const store = require('./utils/store');
store.init('u_test');
require('./pages/pickup/pickup.js');

function ctx() {
  const c = {};
  Object.assign(c, pageConfig); // 复制所有方法
  c.data = JSON.parse(JSON.stringify(pageConfig.data)); // 独立深拷贝 data
  c.setData = (obj) => { for (const k in obj) { c.data[k] = obj[k]; c[k] = obj[k]; } };
  c.getTabBar = () => null;
  return c;
}
function assert(cond, msg) { if (!cond) { throw new Error('FAIL: ' + msg); } console.log('✓ ' + msg); }

const c = ctx();
c.onShow();
assert(c.data.categories.length === 0, '初始无分类（空状态）');

// 新建分类
c.openCatModal();
assert(c.data.showCatModal === true, '打开新建分类弹窗');
c.onCatName({ detail: { value: '菜鸟驿站(1号楼)' } });
c.selectCatColor({ currentTarget: { dataset: { key: 'mint' } } });
assert(c.data.catColor === 'mint', '选择马卡龙色调 mint');
c.confirmCat();
let cats = store.get().pickupCategories;
assert(cats.length === 1 && cats[0].stationName === '菜鸟驿站(1号楼)' && cats[0].color === 'mint', '分类已创建并带色调');
assert(cats[0].codes.length === 0, '新建分类初始无取件码');

// 添加批量取件码（空格 / 逗号 / 换行 混合）
const catId = cats[0].id;
c.openCodeModal({ currentTarget: { dataset: { id: catId } } });
c.onCodeInput({ detail: { value: 'A123-456, B789-012 丰巢-88\nC000-111' } });
c.confirmAddCodes();
cats = store.get().pickupCategories;
assert(cats[0].codes.length === 4, '批量拆分添加 4 个取件码（' + cats[0].codes.map(x=>x.code).join('/') + '）');

// 重复添加应被去重
c.openCodeModal({ currentTarget: { dataset: { id: catId } } });
c.onCodeInput({ detail: { value: 'A123-456 D222-333' } });
c.confirmAddCodes();
assert(store.get().pickupCategories[0].codes.length === 5, '重复 A123-456 被去重，仅新增 D222-333');

// 勾选已取
c.toggleCode({ currentTarget: { dataset: { cat: catId, index: 0 } } });
assert(store.get().pickupCategories[0].codes[0].picked === true, '勾选第一个取件码为已取');
c.toggleCode({ currentTarget: { dataset: { cat: catId, index: 0 } } });
assert(store.get().pickupCategories[0].codes[0].picked === false, '再次勾选取消已取');

// 删除单个取件码
c.deleteCode({ currentTarget: { dataset: { cat: catId, index: 3 } } });
assert(store.get().pickupCategories[0].codes.length === 4, '删除一个取件码后剩 4 个');

// 编辑分类（改名 + 换色）
c.openEditCat({ currentTarget: { dataset: { id: catId } } });
assert(c.data.editingCatId === catId && c.data.catName === '菜鸟驿站(1号楼)', '编辑弹窗预填驿站名');
c.onCatName({ detail: { value: '丰巢柜(南门)' } });
c.selectCatColor({ currentTarget: { dataset: { key: 'sky' } } });
c.confirmCat();
cats = store.get().pickupCategories;
assert(cats[0].stationName === '丰巢柜(南门)' && cats[0].color === 'sky', '编辑后改名并换色调');

// 第二个分类 + 删除分类
c.openCatModal();
c.onCatName({ detail: { value: '妈妈驿站' } });
c.confirmCat();
assert(store.get().pickupCategories.length === 2, '创建第二个分类');
const id2 = store.get().pickupCategories[1].id;
c.deleteCat({ currentTarget: { dataset: { id: id2 } } });
assert(store.get().pickupCategories.length === 1, '删除分类后剩 1 个');

// 渲染结果含进度统计
c.refresh();
assert(c.data.categories[0].total === 4, '渲染统计 total=4');
assert(c.data.categories[0].colorBg === '#E3F2FD' && c.data.categories[0].colorAccent === '#90CAF9', '马卡龙色正确注入渲染数据');

console.log('全部取件码逻辑测试通过 ✅');
