// utils/store.js - 按用户隔离的本地持久化层
// 使用 wx.setStorageSync 长期保存，无需后端即可在设备上持久化。
// 如需跨设备同步，可在此处替换为微信云开发数据库（见 README）。

const USER_DATA_PREFIX = 'lifeapp_user_';

const DEFAULT_SUPPLIES = [
  { id: 'shampoo', name: '洗发水', percent: 30, colorClass: 'cute-pink', barColor: '#F48FB1', categoryId: 'cat_default' },
  { id: 'tissue', name: '纸巾', percent: 50, colorClass: 'cute-green', barColor: '#81C784', categoryId: 'cat_default' },
  { id: 'toothpaste', name: '牙膏', percent: 80, colorClass: 'cute-blue', barColor: '#64B5F6', categoryId: 'cat_default' },
  { id: 'detergent', name: '洗洁精', percent: 20, colorClass: 'cute-yellow', barColor: '#FFD54F', categoryId: 'cat_default' }
];

function defaultData() {
  const d = new Date();
  const today =
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');

  return {
    // 仅保存账户期初余额；当前余额由“期初 + 收入 - 支出”实时计算。
    accountBalances: {
      personal: 5000,
      family: 5000
    },
    balanceMigrationVersion: 1,
    expenses: [
      { date: today, cat: '食', name: '午餐', amount: 25, scope: 'personal', type: 'expense' },
      { date: today, cat: '食', name: '早餐', amount: 12, scope: 'personal', type: 'expense' },
      { date: today, cat: '日常用品', name: '洗漱', amount: 8, scope: 'family', type: 'expense' }
    ],
    necessities: [
      { id: 'n1', name: '牙膏', amount: 20, checked: false },
      { id: 'n2', name: '纸巾', amount: 35, checked: false }
    ],
    wishes: [
      { id: 'w1', name: '蓝牙耳机', amount: 299, checked: false, ownerType: 'personal' },
      { id: 'w2', name: '咖啡机', amount: 899, checked: false, ownerType: 'family' }
    ],
    supplies: DEFAULT_SUPPLIES.map((s) => ({ ...s })),
    supplyCategories: [
      { id: 'cat_default', name: '日常用品消耗' }
    ],
    userInfo: {
      avatar: '',
      nickname: '',
      gender: '',
      age: ''
    },
    settings: {
      hiddenPages: [],
      tabOrder: ['pages/index/index', 'pages/account/account', 'pages/recipe/recipe', 'pages/supply/supply', 'pages/pickup/pickup'],
      // 底部栏第5动态位：记录用户最近从侧边栏打开的额外页（默认取件码，保持初始5页现状）
      fifthPage: 'pages/pickup/pickup',
      // 允许占据第5动态位的额外页（药物/未来新增）。在设置里可增删。
      navbarExtra: ['pages/medication/medication'],
      theme: 'default',
      feedback: '',
      fontScale: 1,        // 全局字号缩放：0.85 / 1 / 1.15 / 1.3
      fontWeight: '400'    // 全局字重：'400' 常规 / '600' 中粗 / '700' 加粗
    },
    ingredients: [
      { name: '西红柿', cat: 'vegetable' },
      { name: '鸡蛋', cat: 'other' },
      { name: '土豆', cat: 'vegetable' },
      { name: '葱', cat: 'vegetable' },
      { name: '生抽', cat: 'seasoning' },
      { name: '青菜', cat: 'vegetable' },
      { name: '五花肉', cat: 'meat' },
      { name: '姜', cat: 'seasoning' }
    ],
    recipes: [
      { name: '西红柿炒蛋', ingredients: ['西红柿', '鸡蛋', '葱', '生抽'], image: '', steps: '' },
      { name: '土豆炖肉', ingredients: ['土豆', '五花肉', '生抽', '姜'], image: '', steps: '' },
      { name: '清炒时蔬', ingredients: ['青菜', '蒜', '盐'], image: '', steps: '' }
    ],
    lifeIndexOrder: [],
    lifeIndexUpdatedAt: 0,
    lifeIndexData: [
      { id: 'todo', label: '今日待办', type: 'todo', bg: '#FFF3E0', hidden: false, data: [] },
      { id: 'checkin', label: '每日打卡', type: 'checkin', bg: '#E8F5E9', hidden: false, data: [] },
      { id: 'task', label: '近期任务', type: 'task', bg: '#E3F2FD', hidden: false, data: [] },
      { id: 'weight', label: '体重记录', type: 'weight', bg: '#F3E5F5', hidden: false, data: [] }
    ],
    // 取件码：用户自建分类（快递驿站），每分类下挂多个取件码，可标记已取
    pickupCategories: [],
    // 药物记录：人物档案 + 家用药物
    medProfiles: [],
    medicines: []
  };
}

var _userId = null;
var _data = null;

function loadRaw(userId) {
  const key = USER_DATA_PREFIX + userId;
  const raw = wx.getStorageSync(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      // JSON 解析失败时备份原始数据，避免静默覆盖用户数据
      console.error('[store] 用户数据 JSON 解析失败:', key, e);
      try {
        wx.setStorageSync(key + '_backup_' + Date.now(), raw);
      } catch (_) {
        // 备份失败也不影响后续流程
      }
      return null;
    }
  }
  return null;
}

function init(userId) {
  _userId = userId;
  var data = loadRaw(userId);
  if (!data) {
    // 首次使用：创建默认数据
    data = defaultData();
    _data = data;
    save();
    return _data;
  }
  // 已有数据：执行兼容性补丁（补全新增字段，不覆盖已有数据）
  var needsLegacyBalanceMigration = !data.accountBalances;
  var def = defaultData();
  for (var k in def) {
    if (data[k] === undefined) data[k] = def[k];
  }
  // 保证 lifeIndexData 的 4 个内置模块都存在（保留已有模块的 data 不丢失）。
  // 注意：保留所有带 id 的模块（含用户自定义的 custom_*），不要按 validIds 过滤掉自定义板块。
  var existing = (data.lifeIndexData || []).filter(function (m) { return m && m.id; });
  def.lifeIndexData.forEach(function (m) {
    if (!existing.find(function (x) { return x.id === m.id; })) {
      existing.push({ id: m.id, label: m.label, type: m.type || m.id, bg: m.bg, hidden: false, data: [] });
    }
  });
  data.lifeIndexData = existing;
  // 为每个模块补齐 hidden / type 字段（兼容旧版本数据）
  data.lifeIndexData.forEach(function (m) {
    if (m.hidden === undefined) m.hidden = false;
    if (!m.type) m.type = m.id;
  });
  if (!Array.isArray(data.lifeIndexOrder)) data.lifeIndexOrder = [];
  if (typeof data.lifeIndexUpdatedAt !== 'number') data.lifeIndexUpdatedAt = 0;
  // 兼容：补充 supplies 的 categoryId
  if (Array.isArray(data.supplies)) {
    data.supplies.forEach(function (s) {
      if (!s.categoryId) s.categoryId = 'cat_default';
    });
  }
  // 兼容：合并 settings 子字段
  if (!data.settings) data.settings = {};
  var defSettings = def.settings;
  for (var sk in defSettings) {
    if (data.settings[sk] === undefined) data.settings[sk] = defSettings[sk];
  }
  // 兼容：合并 userInfo 子字段
  if (!data.userInfo) data.userInfo = {};
  var defInfo = def.userInfo;
  for (var ik in defInfo) {
    if (data.userInfo[ik] === undefined) data.userInfo[ik] = defInfo[ik];
  }
  if (needsLegacyBalanceMigration) {
    data.accountBalances = {
      personal: 0,
      family: Number(data.customBalance) || 0
    };
  }

  migrateAccountData(data);
  _data = data;
  save();
  return _data;
}

function migrateAccountData(data) {
  if (!Array.isArray(data.expenses)) data.expenses = [];
  data.expenses.forEach(function (record) {
    record.amount = Number(record.amount) || 0;
    record.scope = record.scope === 'family' ? 'family' : 'personal';
    record.type = record.type === 'income' ? 'income' : 'expense';
  });

  if (!Array.isArray(data.wishes)) data.wishes = [];
  data.wishes.forEach(function (wish) {
    wish.amount = Number(wish.amount) || 0;
    wish.ownerType = wish.ownerType === 'personal' ? 'personal' : 'family';
  });

  if (!data.accountBalances || typeof data.accountBalances !== 'object') {
    // 历史版本只有 customBalance。为保持旧账本的总余额，迁移为家庭账户期初余额。
    data.accountBalances = {
      personal: 0,
      family: Number(data.customBalance) || 0
    };
  }
  data.accountBalances.personal = Number(data.accountBalances.personal) || 0;
  data.accountBalances.family = Number(data.accountBalances.family) || 0;
  data.balanceMigrationVersion = 1;
  // customBalance 不再参与余额计算，保留字段只为兼容旧版本页面。
}

function get() {
  return _data;
}

function save() {
  if (_userId && _data) {
    wx.setStorageSync(USER_DATA_PREFIX + _userId, JSON.stringify(_data));
  }
}

function reset() {
  _data = defaultData();
  save();
}

module.exports = { init, get, save, reset, defaultData };
