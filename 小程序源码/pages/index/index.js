const store = require('../../utils/store');
const auth = require('../../utils/auth');
const guestHome = require('../../utils/guest-home');
const util = require('../../utils/util');
const cloud = require('../../utils/cloud');
const theme = require('../../utils/theme');
const subscribe = require('../../utils/subscribe');
const navDrawer = require('../../utils/nav-drawer');

function svg(vb, content) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" fill="none">' + content + '</svg>'
    )
  );
}

// 模块图标（与原型一致；note 为自定义记录板块图标）
const ICONS = {
  todo: svg(
    '0 0 20 20',
    '<rect x="4" y="3" width="12" height="15" rx="2" fill="#FFD54F" stroke="#F9A825" stroke-width="0.8"/><rect x="7" y="1.5" width="6" height="3" rx="1" fill="#F9A825"/><path d="M7 10L9 12L13 8" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  ),
  checkin: svg(
    '0 0 20 20',
    '<rect x="3" y="4" width="14" height="13" rx="2" fill="#66BB6A" stroke="#388E3C" stroke-width="0.8"/><path d="M3 7H17" stroke="white" stroke-width="1"/><rect x="6" y="2" width="2" height="4" rx="1" fill="#388E3C"/><rect x="12" y="2" width="2" height="4" rx="1" fill="#388E3C"/><path d="M7 12L9 14L13 10" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  ),
  task: svg(
    '0 0 20 20',
    '<circle cx="10" cy="10" r="7" stroke="#64B5F6" stroke-width="1.5" fill="none"/><circle cx="10" cy="10" r="4" stroke="#1976D2" stroke-width="1.5" fill="none"/><circle cx="10" cy="10" r="1.5" fill="#1976D2"/>'
  ),
  weight: svg(
    '0 0 20 20',
    '<rect x="3" y="4" width="14" height="13" rx="3" fill="#CE93D8" stroke="#8E24AA" stroke-width="0.8"/><circle cx="10" cy="10" r="4" fill="white" fill-opacity="0.3"/><path d="M10 7L11 10L10 10.5L9 10Z" fill="#8E24AA"/><path d="M10 10V13" stroke="#8E24AA" stroke-width="1" stroke-linecap="round"/>'
  ),
  number: svg(
    '0 0 20 20',
    '<rect x="3" y="3" width="14" height="14" rx="3" fill="#FFCC80" stroke="#FF8A65" stroke-width="0.8"/><text x="10" y="13" text-anchor="middle" font-size="8" fill="#FF8A65" font-weight="bold">N</text>'
  ),
  note: svg(
    '0 0 20 20',
    '<rect x="3" y="2" width="14" height="16" rx="2" fill="#B0D9B1" stroke="#388E3C" stroke-width="0.8"/><path d="M6 6H14M6 9H14M6 12H11" stroke="white" stroke-width="1.4" stroke-linecap="round"/>'
  )
};
const BUILTIN_TYPES = ['todo', 'checkin', 'task', 'weight'];

// 新建板块时可选择的功能类型
const CREATE_TYPES = [
  { type: 'todo', label: '待办清单', desc: '勾选完成的事项清单', bg: '#FFF3E0' },
  { type: 'checkin', label: '每日打卡', desc: '连续 N 天打卡挑战', bg: '#E8F5E9' },
  { type: 'task', label: '近期任务', desc: '带优先级与截止日的任务', bg: '#E3F2FD' },
  { type: 'number', label: '数值记录', desc: '身高/体重/个数等数值', bg: '#FFF8E0' },
  { type: 'custom', label: '生活记录', desc: '通用文字记录清单', bg: '#FFF8F0' }
];

const UNITS = ['kg', 'cm', 'm', '个', '次', '升', '分钟', '元', '步', '%'];

const EDIT_ICON = svg('0 0 13 13', '<path d="M8.5 1.5L11.5 4.5L4 12L1 12L1 9L8.5 1.5Z" stroke="#C88E8E" stroke-width="1" fill="none" stroke-linejoin="round"/>');
const DEL_ICON = svg('0 0 10 10', '<path d="M2 2L8 8M8 2L2 8" stroke="#C88E8E" stroke-width="1.5" stroke-linecap="round"/>');
const CHECK12 = svg('0 0 12 12', '<path d="M3 6L5 8L9 4" stroke="#333333" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
const PLUS16 = svg('0 0 16 16', '<path d="M8 2V14M2 8H14" stroke="#333333" stroke-width="2" stroke-linecap="round"/>');
const BELL_OFF = svg('0 0 24 24', '<path d="M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5Z" fill="#C9C9C9"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="#C9C9C9" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
const BELL_ON = svg('0 0 24 24', '<path d="M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5Z" fill="#FFB300"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="#FFB300" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
const BRAND_ICON = svg(
  '0 0 28 28',
  '<path d="M14 4C8 4 4 8 4 14C4 20 8 24 14 24C20 24 24 20 24 14C24 8 20 4 14 4Z" fill="#B0D9B1"/>' +
  '<path d="M14 8C11 8 9 11 9 14C9 17 11 20 14 20C17 20 19 17 19 14C19 11 17 8 14 8Z" fill="#8FCB90"/>' +
  '<path d="M14 8V20M9 14H19M11 11L17 17M17 11L11 17" stroke="#5E4B3C" stroke-width="1.2" stroke-linecap="round"/>'
);

const SETTINGS_ICON = svg('0 0 20 20',
  '<circle cx="10" cy="10" r="3" fill="none" stroke="#C88E8E" stroke-width="1.5"/><path d="M10 1V3M10 17V19M1 10H3M17 10H19M3.5 3.5L5 5M15 15L16.5 16.5M3.5 16.5L5 15M15 5L16.5 3.5" stroke="#C88E8E" stroke-width="1.5" stroke-linecap="round"/>');

function getSession() {
  return auth.getSession();
}

function isLoggedIn() {
  var session = getSession();
  return !!(session && session.userId);
}

// 当 session 丢失但用户数据可能还在时，尝试从存储恢复
function tryRecoverStore() {
  if (store.get()) return true; // 已经初始化，无需恢复
  try {
    var accounts = wx.getStorageSync('lifeapp_accounts') || [];
    for (var i = accounts.length - 1; i >= 0; i--) {
      var acct = accounts[i];
      if (acct && acct.userId) {
        var raw = wx.getStorageSync('lifeapp_user_' + acct.userId);
        if (raw) {
          wx.setStorageSync('lifeapp_session', { userId: acct.userId, account: acct.account });
          store.init(acct.userId);
          var app = getApp();
          if (app) {
            app.globalData.userId = acct.userId;
            app.globalData.account = acct.account;
          }
          return true;
        }
      }
    }
  } catch (e) {
    // 恢复失败，静默处理
  }
  return false;
}

function getHomeData() {
  if (isLoggedIn()) {
    if (!store.get()) store.init(getSession().userId);
    return store.get();
  }
  if (tryRecoverStore()) {
    return store.get();
  }
  return guestHome.get();
}

function requireLogin() {
  if (isLoggedIn()) return true;
  wx.showModal({
    title: '登录后可保存',
    content: '登录微信后可编辑资料并长期保存生活记录。',
    confirmText: '微信登录',
    success(res) {
      if (res.confirm) wx.navigateTo({ url: '/pages/login/login' });
    }
  });
  return false;
}

function getModule(id) {
  const d = getHomeData().lifeIndexData || [];
  return d.find((x) => x.id === id) || null;
}

function getModuleData(id) {
  const m = getModule(id);
  return m ? m.data : null;
}

// 按 lifeIndexData 数组顺序渲染（数组顺序即为展示顺序），过滤隐藏板块
function computeModules() {
  const li = getHomeData().lifeIndexData || [];
  const result = [];
  li.forEach((m) => {
    if (m.hidden) return;
    const data = m.data || [];
    const base = {
      id: m.id,
      label: m.label,
      bg: m.bg,
      icon: ICONS[m.type] || ICONS.note,
      type: m.type
    };

    if (m.type === 'todo') {
      const done = data.filter((t) => t.done).length;
      const rows = data.slice(0, 2).map((t) => ({ text: t.text, done: t.done, meta: '' }));
      base.preview = data.length ? done + '/' + data.length + ' 已完成' : '点击添加';
      base.rows = rows;
      base.more = Math.max(0, data.length - 2);
    } else if (m.type === 'checkin') {
      // 新模型：每个任务有 totalDays（总天数）与 checks[]（各天是否完成）
      let doneTotal = 0;
      let goalTotal = 0;
      const rows = data.slice(0, 2).map((h) => {
        const total = Number(h.totalDays) || (Array.isArray(h.checks) ? h.checks.length : 21);
        const done = (h.checks || []).filter(Boolean).length;
        doneTotal += done;
        goalTotal += total;
        return { text: h.name, done: done > 0, meta: done + '/' + total + ' 天' };
      });
      base.preview = data.length ? ('已完成 ' + doneTotal + '/' + goalTotal + ' 天') : '点击添加';
      base.rows = rows;
      base.more = Math.max(0, data.length - 2);
    } else if (m.type === 'task') {
      const pending = data.filter((t) => !t.done);
      const showList = pending.length ? pending : data;
      const priColors = { high: '#E57373', medium: '#FFD54F', low: '#81C784' };
      const rows = showList.slice(0, 2).map((t) => ({
        text: t.text, done: t.done, meta: (t.remind ? '🔔 ' : '') + (t.deadline || ''), barColor: priColors[t.priority] || '#FFD54F'
      }));
      const preview = data.length ? (pending.length ? pending.length + ' 项进行中' : '全部完成') : '点击添加';
      base.preview = preview;
      base.rows = rows;
      base.more = Math.max(0, showList.length - 2);
    } else if (m.type === 'weight') {
      let latestWeight = null;
      let rows = [];
      if (data.length) {
        const latest = data[data.length - 1];
        let trend = '';
        let trendColor = '#999';
        if (data.length >= 2) {
          const diff = latest.weight - data[data.length - 2].weight;
          if (diff > 0) { trend = ' ↑' + diff.toFixed(1); trendColor = '#F4B8B8'; }
          else if (diff < 0) { trend = ' ↓' + Math.abs(diff).toFixed(1); trendColor = '#B0D9B1'; }
          else { trend = ' 持平'; }
        }
        latestWeight = { value: latest.weight, unit: 'kg', trend: trend, trendColor: trendColor };
        if (data.length >= 2) {
          rows = [{ text: '上次 ' + data[data.length - 2].date.slice(5) + ' · ' + data[data.length - 2].weight + 'kg', meta: '', done: false }];
        }
      }
      base.preview = data.length ? (data[data.length - 1].weight + 'kg' + (latestWeight ? latestWeight.trend : '')) : '点击记录';
      base.weight = latestWeight;
      base.rows = rows;
      base.more = 0;
    } else if (m.type === 'number') {
      const unit = m.unit || 'kg';
      let latestValue = null;
      let rows = [];
      if (data.length) {
        const latest = data[data.length - 1];
        let trend = '';
        let trendColor = '#999';
        if (data.length >= 2) {
          const diff = latest.value - data[data.length - 2].value;
          if (diff > 0) { trend = ' ↑' + diff.toFixed(1); trendColor = '#F4B8B8'; }
          else if (diff < 0) { trend = ' ↓' + Math.abs(diff).toFixed(1); trendColor = '#B0D9B1'; }
          else { trend = ' 持平'; }
        }
        latestValue = { value: latest.value, unit: unit, trend: trend, trendColor: trendColor };
        if (data.length >= 2) {
          rows = [{ text: '上次 ' + data[data.length - 2].date.slice(5) + ' · ' + data[data.length - 2].value + unit, meta: '', done: false }];
        }
      }
      base.preview = data.length ? (data[data.length - 1].value + unit + (latestValue ? latestValue.trend : '')) : '点击记录';
      base.weight = latestValue;
      base.rows = rows;
      base.more = 0;
    } else {
      // 自定义「生活记录」板块：通用记录清单
      const done = data.filter((r) => r.done).length;
      const rows = data.slice(0, 2).map((r) => ({ text: r.text, done: !!r.done, meta: '' }));
      base.preview = data.length ? (done ? done + '/' + data.length + ' 完成' : data.length + ' 条记录') : '点击添加记录';
      base.rows = rows;
      base.more = Math.max(0, data.length - 2);
    }
    result.push(base);
  });
  return result;
}

Page({
  data: {
    themeClass: 'default',
    themePrimary: '#F4B8B8',
    appFontScale: 1,
    appFontWeight: '400',
    modules: [],
    brandIcon: '',
    settingsIcon: SETTINGS_ICON,
    activeModule: '',
    activeModuleType: '',
    modalTitle: '',
    editIcon: EDIT_ICON,
    delIcon: DEL_ICON,
    checkIcon: CHECK12,
    plusIcon: PLUS16,
    bellOnIcon: BELL_ON,
    bellOffIcon: BELL_OFF,
    // 管理弹窗
    manageVisible: false,
    manageList: [],
    draggingIndex: -1,
    dragOffset: 0,
    editingId: '',
    editTitle: '',
    showCreateModal: false,
    newModuleName: '',
    createStep: 'type',          // 'type' 选择功能类型 -> 'config' 配置名称/单位/天数
    createType: '',              // 待创建的类型
    createUnit: 'kg',            // 数值记录单位
    createTypes: CREATE_TYPES.map((t) => ({ ...t, icon: ICONS[t.type] || ICONS.note })),
    units: UNITS,
    // 自定义板块弹窗
    customInput: '',
    customList: [],
    // 数值记录弹窗
    numberInput: '',
    numberNoteInput: '',
    numberList: [],
    numberLatest: null,
    numberUnit: 'kg',
    // 用户信息
    userInfo: { avatar: '', nickname: '', gender: '', age: '' },
    account: '',
    shortId: '',
    showProfileModal: false,
    profileNickname: '',
    profileGender: '',
    profileAge: '',
    // 弹窗输入
    todoInput: '',
    taskInput: '',
    taskDeadline: '',
    taskPriority: 'medium',
    weightInput: '',
    // 弹窗列表
    todoList: [],
    todoProgress: 0,
    checkinList: [],
    taskList: [],
    weightList: [],
    weightLatest: null,

    // 打卡：新建任务弹窗
    checkinCreateVisible: false,
    checkinTaskName: '',
    checkinTotalDays: 21,
    checkinDayOptions: [7, 14, 21, 30, 100],
    checkinCustomDays: '',
    checkinEffectiveDays: 21
  },

  noop() {},

  onLoad() {
    // 拖拽排序时每个管理项的高度（rpx -> px），用于计算跨项位移
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.ITEM_H_PX = ((info.windowWidth || 375) / 750) * 104;
    } catch (e) {
      this.ITEM_H_PX = 52; // 104rpx 在 375 宽屏下的近似值兜底
    }
    navDrawer.attach(this);
  },

  onShow() {
    var app = getApp();
    const themeName = app.globalData.currentTheme || 'default';
    this.setData({ themeClass: themeName, themePrimary: theme.getTheme(themeName).primary });
    theme.applyFont(this);
    navDrawer.attach(this);
    if (this.getTabBar()) this.getTabBar().refreshBar();
    getHomeData();
    this.setData({ brandIcon: BRAND_ICON });
    this.loadUserInfo();
    this.refresh();

    // 仅在本次会话首次进入时拉取云端（时间戳 LWW），避免每次切换 tab 都打网络
    if (!this._lifeIndexPulled) {
      this._lifeIndexPulled = true;
      this.pullLifeIndex().then(() => {
        this.refresh();
        if (this.data.manageVisible) this.buildManageList();
      });
    }
  },

  loadUserInfo() {
    var data = getHomeData();
    var session = getSession();
    var userId = session ? session.userId : '';
    this.setData({
      userInfo: data.userInfo || { avatar: '', nickname: '', gender: '', age: '' },
      account: session ? session.account : '游客浏览',
      shortId: userId ? userId.replace(/^u_/, '').replace(/^wx_/, '').replace(/^openid_/, '').slice(0, 8) : 'GUEST'
    });
  },

  refresh() {
    this.setData({ modules: computeModules() });
  },

  // ===== 本地保存 + 防抖云同步 =====
  persistLifeIndex() {
    const data = getHomeData();
    if (!data || !data.lifeIndexData) return;
    data.lifeIndexUpdatedAt = Date.now();
    store.save();
    const session = getSession();
    const userId = session && session.userId;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    const self = this;
    this._syncTimer = setTimeout(() => {
      cloud.syncLifeIndex(userId, getHomeData().lifeIndexData);
    }, 800);
  },

  // 首次进入时拉取云端配置（云端更新时间更新则采用，本地优先避免覆盖未同步的编辑）
  async pullLifeIndex() {
    if (!cloud.isConfigured() || !wx.cloud || !wx.cloud.database) return;
    const session = getSession();
    if (!session || !session.userId) return;
    const local = getHomeData();
    if (!local || !local.lifeIndexData) return;
    const doc = await cloud.fetchLifeIndex(session.userId);
    if (doc && Array.isArray(doc.modules) && doc.modules.length) {
      if ((doc.updatedAt || 0) > (local.lifeIndexUpdatedAt || 0)) {
        local.lifeIndexData = doc.modules;
        local.lifeIndexUpdatedAt = doc.updatedAt || Date.now();
        store.save();
      }
    }
  },

  openModule(e) {
    const id = e.currentTarget.dataset.id;
    const m = getModule(id);
    this.setData({ activeModule: id, modalTitle: m ? m.label : '', activeModuleType: m ? m.type : '', numberUnit: (m && m.unit) || 'kg' });
    this.refreshModal();
  },

  closeModule() {
    this.setData({ activeModule: '' });
  },

  refreshModal() {
    const id = this.data.activeModule;
    const type = this.data.activeModuleType;
    const d = getModuleData(id) || [];
    if (type === 'todo') {
      const done = d.filter((t) => t.done).length;
      this.setData({
        todoList: d.map((t, i) => ({ ...t, index: i })),
        todoProgress: d.length ? Math.round((done / d.length) * 100) : 0
      });
    } else if (type === 'checkin') {
      // 新模型：迁移旧数据（history/targetDays -> checks[]），无 checks 时按 totalDays 初始化
      let migrated = false;
      const list = d.map((h, i) => {
        if (!Array.isArray(h.checks)) {
          const total = Number(h.totalDays) || Number(h.targetDays) || 21;
          h.totalDays = total;
          h.checks = new Array(total).fill(false);
          delete h.history;
          delete h.targetDays;
          migrated = true;
        }
        const total = h.totalDays;
        const done = (h.checks || []).filter(Boolean).length;
        return {
          name: h.name,
          totalDays: total,
          doneCount: done,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          cells: (h.checks || []).map((c) => ({ checked: !!c })),
          index: i
        };
      });
      this.setData({ checkinList: list });
      if (migrated) this.persistLifeIndex();
    } else if (type === 'task') {
      const order = { high: 0, medium: 1, low: 2 };
      const pri = { high: '#E57373', medium: '#FFD54F', low: '#81C784' };
      const sorted = d
        .map((t, i) => ({ ...t, index: i }))
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return (order[a.priority] || 1) - (order[b.priority] || 1);
        });
      this.setData({ taskList: sorted.map((t) => ({ ...t, barColor: pri[t.priority] || '#FFD54F', remind: !!t.remind })) });
    } else if (type === 'weight') {
      const list = d
        .slice()
        .reverse()
        .map((r, i) => {
          const realIdx = d.length - 1 - i;
          let diffStr = '';
          if (realIdx > 0) {
            const diff = r.weight - d[realIdx - 1].weight;
            diffStr = diff > 0 ? '+' + diff.toFixed(1) : diff < 0 ? diff.toFixed(1) : '';
          }
          return { date: r.date, weight: r.weight, diffStr, index: realIdx };
        });
      this.setData({ weightList: list, weightLatest: d.length ? d[d.length - 1] : null });
    } else if (type === 'number') {
      const unit = this.data.numberUnit;
      const list = d
        .slice()
        .reverse()
        .map((r, i) => {
          const realIdx = d.length - 1 - i;
          let diffStr = '';
          if (realIdx > 0) {
            const diff = r.value - d[realIdx - 1].value;
            diffStr = diff > 0 ? '+' + diff.toFixed(1) : diff < 0 ? diff.toFixed(1) : '';
          }
          return { date: r.date, value: r.value, note: r.note || '', diffStr, index: realIdx };
        });
      this.setData({ numberList: list, numberLatest: d.length ? d[d.length - 1] : null });
    } else {
      // 自定义记录板块
      const list = d.map((r, i) => ({ text: r.text, done: !!r.done, index: i }));
      this.setData({ customList: list });
    }
  },

  // ===== 待办 =====
  onTodoInput(e) { this.setData({ todoInput: e.detail.value }); },
  addTodo() {
    const text = (this.data.todoInput || '').trim();
    if (!text) return;
    if (!requireLogin()) return;
    getModuleData(this.data.activeModule).push({ text, done: false });
    this.setData({ todoInput: '' });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  toggleTodo(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const d = getModuleData(this.data.activeModule);
    if (d[i]) { d[i].done = !d[i].done; this.persistLifeIndex(); this.refreshModal(); this.refresh(); }
  },
  deleteTodo(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    getModuleData(this.data.activeModule).splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 打卡（新模型：总天数挑战，每格代表一天，单日仅可打卡一次）=====
  onCheckinTaskName(e) { this.setData({ checkinTaskName: e.detail.value }); },
  openCheckinCreate() {
    this.setData({
      checkinCreateVisible: true,
      checkinTaskName: '',
      checkinTotalDays: 21,
      checkinCustomDays: '',
      checkinEffectiveDays: 21
    });
  },
  closeCheckinCreate() {
    this.setData({
      checkinCreateVisible: false,
      checkinTaskName: '',
      checkinTotalDays: 21,
      checkinCustomDays: '',
      checkinEffectiveDays: 21
    });
  },
  selectCheckinTotalDays(e) {
    const d = Number(e.currentTarget.dataset.d);
    this.setData({ checkinTotalDays: d, checkinCustomDays: '', checkinEffectiveDays: d });
  },
  onCheckinCustomDays(e) {
    const raw = (e.detail.value || '').trim();
    this.setData({ checkinCustomDays: raw });
    const v = Number(raw);
    const eff = Number.isFinite(v) && v >= 1 && v <= 365 ? Math.round(v) : this.data.checkinTotalDays;
    this.setData({ checkinEffectiveDays: eff });
  },
  confirmCheckinCreate() {
    const name = (this.data.checkinTaskName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }
    const days = this.data.checkinEffectiveDays;
    if (!requireLogin()) return;
    getModuleData(this.data.activeModule).push({
      name: name,
      totalDays: days,
      checks: new Array(days).fill(false)
    });
    this.setData({
      checkinCreateVisible: false,
      checkinTaskName: '',
      checkinTotalDays: 21,
      checkinCustomDays: '',
      checkinEffectiveDays: 21
    });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
    wx.showToast({ title: '已创建', icon: 'success' });
  },
  // 点击某天格子：空白 -> 填充浅色 + 对勾；已打卡 -> 单日不可重复
  toggleCheckinCell(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const cell = Number(e.currentTarget.dataset.cell);
    const d = getModuleData(this.data.activeModule);
    const item = d && d[i];
    if (!item || !Array.isArray(item.checks)) return;
    if (item.checks[cell]) {
      wx.showToast({ title: '该天已打卡', icon: 'none' });
      return;
    }
    item.checks[cell] = true;
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  deleteCheckin(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    getModuleData(this.data.activeModule).splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 任务 =====
  onTaskInput(e) { this.setData({ taskInput: e.detail.value }); },
  onTaskDeadline(e) { this.setData({ taskDeadline: e.detail.value }); },
  selectTaskPriority(e) { this.setData({ taskPriority: e.currentTarget.dataset.p }); },
  addTask() {
    const text = (this.data.taskInput || '').trim();
    if (!text) return;
    if (!requireLogin()) return;
    getModuleData(this.data.activeModule).push({
      text,
      priority: this.data.taskPriority,
      deadline: this.data.taskDeadline,
      done: false
    });
    this.setData({ taskInput: '', taskDeadline: '' });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  toggleTask(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const d = getModuleData(this.data.activeModule);
    if (d[i]) { d[i].done = !d[i].done; this.persistLifeIndex(); this.refreshModal(); this.refresh(); }
  },
  deleteTask(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    getModuleData(this.data.activeModule).splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 任务到期微信提醒（订阅消息）=====
  // 每个任务独立订阅一次：点击铃铛 -> 取 openid -> 请求订阅授权 -> 写入提醒标记。
  // 实际推送由云函数 taskReminder（定时触发）在该任务到期当天完成。
  toggleTaskRemind(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const d = getModuleData(this.data.activeModule);
    const task = d && d[i];
    if (!task) return;

    // 已开启 -> 关闭提醒，清除标记
    if (task.remind) {
      task.remind = false;
      task.reminded = false;
      this.persistLifeIndex();
      this.refreshModal();
      this.refresh();
      wx.showToast({ title: '已关闭提醒', icon: 'none' });
      return;
    }

    // 未设置截止日无法提醒
    if (!task.deadline) {
      wx.showToast({ title: '请先设置截止日再开启提醒', icon: 'none' });
      return;
    }
    // 订阅消息仅真实微信环境可用
    if (!subscribe.isAvailable()) {
      wx.showToast({ title: '当前环境不支持订阅消息', icon: 'none' });
      return;
    }
    // 必须先在后台配置模板 ID
    if (!subscribe.getTemplateId()) {
      wx.showToast({ title: '请在后台配置订阅消息模板', icon: 'none' });
      return;
    }

    const self = this;
    // 先取 openid（云函数需它定向推送），再请求用户订阅授权
    subscribe
      .getOpenid()
      .then((openid) => subscribe.requestTaskReminder().then((accepted) => ({ openid: openid, accepted: accepted })))
      .then((res) => {
        if (!res.accepted) {
          wx.showToast({ title: '未授权，无法提醒', icon: 'none' });
          return;
        }
        task.remind = true;
        task.reminded = false;
        task.remindAt = Date.now();
        if (res.openid) task.openid = res.openid;
        self.persistLifeIndex();
        self.refreshModal();
        self.refresh();
        wx.showToast({ title: '已开启到期提醒', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '需开启云开发后使用提醒', icon: 'none' });
      });
  },

  // ===== 体重 =====
  onWeightInput(e) { this.setData({ weightInput: e.detail.value }); },
  addWeight() {
    if (!requireLogin()) return;
    const w = parseFloat(this.data.weightInput);
    if (isNaN(w)) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }
    const today = util.todayStr();
    const d = getModuleData(this.data.activeModule);
    const existing = d.find((r) => r.date === today);
    if (existing) existing.weight = w;
    else d.push({ date: today, weight: w });
    this.setData({ weightInput: '' });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  deleteWeight(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    getModuleData(this.data.activeModule).splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 数值记录（自定义单位）=====
  onNumberInput(e) { this.setData({ numberInput: e.detail.value }); },
  onNumberNoteInput(e) { this.setData({ numberNoteInput: e.detail.value }); },
  addNumber() {
    if (!requireLogin()) return;
    const v = parseFloat(this.data.numberInput);
    if (isNaN(v)) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }
    const today = util.todayStr();
    const d = getModuleData(this.data.activeModule);
    const existing = d.find((r) => r.date === today);
    if (existing) {
      existing.value = v;
      existing.note = (this.data.numberNoteInput || '').trim();
    } else {
      d.push({ date: today, value: v, note: (this.data.numberNoteInput || '').trim() });
    }
    this.setData({ numberInput: '', numberNoteInput: '' });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  deleteNumber(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    getModuleData(this.data.activeModule).splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 自定义记录板块 =====
  onCustomInput(e) { this.setData({ customInput: e.detail.value }); },
  addCustomRecord() {
    const id = this.data.activeModule;
    const text = (this.data.customInput || '').trim();
    if (!text) return;
    if (!requireLogin()) return;
    getModuleData(id).push({ text, createdAt: util.todayStr(), done: false });
    this.setData({ customInput: '' });
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },
  toggleCustomRecord(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const d = getModuleData(this.data.activeModule);
    if (d[i]) { d[i].done = !d[i].done; this.persistLifeIndex(); this.refreshModal(); this.refresh(); }
  },
  deleteCustomRecord(e) {
    if (!requireLogin()) return;
    const i = e.currentTarget.dataset.index;
    const d = getModuleData(this.data.activeModule);
    d.splice(i, 1);
    this.persistLifeIndex();
    this.refreshModal();
    this.refresh();
  },

  // ===== 板块管理（拖拽排序 / 隐藏 / 重命名 / 删除 / 新建）=====
  openManage() {
    if (!requireLogin()) return;
    this.buildManageList();
    this.setData({ manageVisible: true });
  },
  closeManage() {
    this.setData({ manageVisible: false, editingId: '', editTitle: '' });
  },
  buildManageList() {
    const li = (getHomeData().lifeIndexData || []).map((m) => ({
      id: m.id,
      label: m.label,
      type: m.type,
      hidden: !!m.hidden,
      builtin: BUILTIN_TYPES.indexOf(m.type) >= 0,
      icon: ICONS[m.type] || ICONS.note
    }));
    this.setData({ manageList: li, draggingIndex: -1, dragOffset: 0, editingId: '', editTitle: '' });
  },

  // 拖拽排序：经典「跨项位移」算法
  onDragStart(e) {
    const idx = e.currentTarget.dataset.index;
    this.drag = { index: idx, startY: e.touches[0].clientY, offset: 0 };
    this.setData({ draggingIndex: idx });
  },
  onDragMove(e) {
    if (!this.drag) return;
    const h = this.ITEM_H_PX || 52;
    const curY = e.touches[0].clientY;
    let offset = curY - this.drag.startY;
    let idx = this.drag.index;
    const list = this.data.manageList.slice();
    while (offset < -h / 2 && idx > 0) {
      const tmp = list[idx - 1]; list[idx - 1] = list[idx]; list[idx] = tmp;
      idx--; this.drag.startY -= h; offset += h;
    }
    while (offset > h / 2 && idx < list.length - 1) {
      const tmp = list[idx + 1]; list[idx + 1] = list[idx]; list[idx] = tmp;
      idx++; this.drag.startY += h; offset -= h;
    }
    this.drag.index = idx;
    this.drag.offset = offset;
    this.setData({ manageList: list, dragOffset: offset });
  },
  onDragEnd() {
    if (!this.drag) return;
    this.setData({ draggingIndex: -1, dragOffset: 0 });
    this.drag = null;
    this.applyManageOrder();
  },
  applyManageOrder() {
    const order = this.data.manageList.map((m) => m.id);
    const li = getHomeData().lifeIndexData;
    if (!li) return;
    li.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    this.persistLifeIndex();
    this.refresh();
  },

  toggleModuleHidden(e) {
    const id = e.currentTarget.dataset.id;
    const li = getHomeData().lifeIndexData;
    const m = li.find((x) => x.id === id);
    if (!m) return;
    m.hidden = !m.hidden;
    const manageList = this.data.manageList.map((x) => (x.id === id ? { ...x, hidden: m.hidden } : x));
    this.setData({ manageList });
    this.persistLifeIndex();
    this.refresh();
  },

  startRename(e) {
    const id = e.currentTarget.dataset.id;
    const m = getModule(id);
    this.setData({ editingId: id, editTitle: m ? m.label : '' });
  },
  onRenameInput(e) { this.setData({ editTitle: e.detail.value }); },
  confirmRename() {
    const id = this.data.editingId;
    const label = (this.data.editTitle || '').trim();
    if (id && label) {
      const m = getModule(id);
      if (m) m.label = label;
    }
    this.setData({ editingId: '', editTitle: '' });
    this.buildManageList();
    this.persistLifeIndex();
    this.refresh();
  },

  deleteModule(e) {
    const id = e.currentTarget.dataset.id;
    const m = getModule(id);
    if (!m) return;
    if (BUILTIN_TYPES.indexOf(m.type) >= 0) {
      wx.showToast({ title: '内置板块不可删除', icon: 'none' });
      return;
    }
    const self = this;
    wx.showModal({
      title: '删除板块',
      content: '确定删除「' + (m.label || '该板块') + '」及其所有记录？',
      confirmColor: this.themePrimary || '#F4B8B8',
      success(res) {
        if (res.confirm) {
          const li = getHomeData().lifeIndexData;
          const idx = li.findIndex((x) => x.id === id);
          if (idx >= 0) li.splice(idx, 1);
          self.buildManageList();
          self.persistLifeIndex();
          self.refresh();
        }
      }
    });
  },

  // ===== 新建板块 =====
  openCreate() {
    // 先关闭管理弹窗，避免两个 modal-overlay 叠加产生重影
    this.setData({ manageVisible: false, showCreateModal: true, createStep: 'type', createType: '', createUnit: 'kg', newModuleName: '' });
  },
  closeCreate() {
    this.setData({ showCreateModal: false, newModuleName: '', createStep: 'type', createType: '', createUnit: 'kg' });
  },
  selectCreateType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ createStep: 'config', createType: type, createUnit: 'kg' });
  },
  backCreateType() {
    this.setData({ createStep: 'type', createType: '', createUnit: 'kg', newModuleName: '' });
  },
  onNewModuleName(e) { this.setData({ newModuleName: e.detail.value }); },
  onCreateUnit(e) { this.setData({ createUnit: e.detail.value }); },
  onCreateUnitPill(e) { this.setData({ createUnit: e.currentTarget.dataset.u }); },
  confirmCreate() {
    const name = (this.data.newModuleName || '').trim();
    const type = this.data.createType;
    if (!type) {
      wx.showToast({ title: '请选择功能类型', icon: 'none' });
      return;
    }
    if (!name) {
      wx.showToast({ title: '请输入板块名称', icon: 'none' });
      return;
    }
    if (!requireLogin()) return;
    const meta = CREATE_TYPES.find((t) => t.type === type) || CREATE_TYPES[CREATE_TYPES.length - 1];
    const li = getHomeData().lifeIndexData;
    const id = type + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const module = { id, label: name, type, bg: meta.bg, hidden: false, data: [] };
    if (type === 'number') module.unit = (this.data.createUnit || '').trim() || 'kg';
    li.push(module);
    this.setData({ showCreateModal: false, newModuleName: '', createStep: 'type', createType: '', createUnit: 'kg' });
    this.buildManageList();
    this.persistLifeIndex();
    this.refresh();
    wx.showToast({ title: '已创建', icon: 'success' });
  },

  // ===== 用户信息 =====
  chooseAvatar() {
    if (!requireLogin()) return;
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        var tempPath = res.tempFiles[0].tempFilePath;
        var fs = wx.getFileSystemManager();
        var savedPath = wx.env.USER_DATA_PATH + '/avatar_' + Date.now() + '.png';
        fs.saveFile({
          tempFilePath: tempPath,
          filePath: savedPath,
          success: function () {
            var data = store.get();
            if (!data.userInfo) data.userInfo = {};
            data.userInfo.avatar = savedPath;
            store.save();
            that.setData({ 'userInfo.avatar': savedPath });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
          fail: function () {
            var data = store.get();
            if (!data.userInfo) data.userInfo = {};
            data.userInfo.avatar = tempPath;
            store.save();
            that.setData({ 'userInfo.avatar': tempPath });
          }
        });
      }
    });
  },

  openProfileModal() {
    if (!requireLogin()) return;
    var info = this.data.userInfo;
    this.setData({
      showProfileModal: true,
      profileNickname: info.nickname || '',
      profileGender: info.gender || '',
      profileAge: info.age || ''
    });
  },

  closeProfileModal() {
    this.setData({ showProfileModal: false });
  },

  onProfileNickname(e) { this.setData({ profileNickname: e.detail.value }); },
  onProfileAge(e) { this.setData({ profileAge: e.detail.value }); },
  selectGender(e) { this.setData({ profileGender: e.currentTarget.dataset.g }); },

  saveProfile() {
    if (!requireLogin()) return;
    var data = store.get();
    if (!data.userInfo) data.userInfo = {};
    data.userInfo.nickname = (this.data.profileNickname || '').trim();
    data.userInfo.gender = this.data.profileGender;
    data.userInfo.age = (this.data.profileAge || '').trim();
    store.save();
    this.setData({
      showProfileModal: false,
      userInfo: {
        avatar: data.userInfo.avatar,
        nickname: data.userInfo.nickname,
        gender: data.userInfo.gender,
        age: data.userInfo.age
      }
    });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  }
});
