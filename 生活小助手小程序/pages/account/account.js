const store = require('../../utils/store');
const auth = require('../../utils/auth');
const util = require('../../utils/util');
const theme = require('../../utils/theme');
const navDrawer = require('../../utils/nav-drawer');

function ensureStore() {
  if (!store.get()) {
    const session = auth.getSession();
    if (session && session.userId) store.init(session.userId);
  }
}

function dateValue(date) {
  return new Date(String(date || '') + 'T00:00:00').getTime();
}

function svg(vb, content) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" fill="none">' + content + '</svg>');
}

const EDIT_ICON = svg('0 0 20 20', '<path d="M13.5 2.5L17.5 6.5L7 17L3 17L3 13L13.5 2.5Z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>');
const CHECK_ICON = svg('0 0 12 12', '<path d="M3 6L5 8L9 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');

Page({
  data: {
    themeClass: 'default',
    themeText: '#5E4B3C',
    appFontScale: 1,
    appFontWeight: '400',
    themeTrack: 'rgba(244,184,184,0.18)',
    editIcon: '',
    checkIcon: '',
    balance: '¥0.00',
    personalBalance: '¥0.00',
    familyBalance: '¥0.00',
    statTodayExpense: '¥0.00',
    statMonthExpense: '¥0.00',
    statMonthIncome: '¥0.00',
    expenseDate: '',
    expenseDateLabel: '',
    expenseScope: 'all',
    expenseList: [],
    necessityList: [],
    wishList: [],
    wishScope: 'all',
    necessityTotal: '¥0.00',
    wishTotal: '¥0.00',
    chartPeriod: 'today',
    chartScope: 'all',
    chartType: 'expense',
    chartStart: '',
    chartEnd: '',
    chartLegend: [],
    modalType: '',
    modalTitle: '',
    modalName: '',
    modalAmount: '',
    modalCat: '食',
    modalScope: 'personal',
    modalDate: '',
    modalRecordType: 'expense',
    cats: util.EXPENSE_CATS.map((item) => item.name),
    showBalanceModal: false,
    balanceInput: '',
    balanceAccount: 'personal'
  },

  onShow() {
    var app = getApp();
    var themeName = app.globalData.currentTheme || 'default';
    var tc = theme.getTheme(themeName);
    this.setData({
      themeClass: themeName,
      themeText: tc.text,
      themeTrack: 'rgba(' + tc.primaryRgb + ', 0.18)'
    });
    theme.applyFont(this);
    navDrawer.attach(this);
    if (this.getTabBar()) this.getTabBar().refreshBar();
    ensureStore();
    if (!store.get()) return;
    const today = util.todayStr();
    this.setData({
      expenseDate: today,
      chartStart: today,
      chartEnd: today,
      editIcon: EDIT_ICON,
      checkIcon: CHECK_ICON
    });
    this.refresh();
  },

  onReady() {
    this.initCanvas();
  },

  noop() {},

  initCanvas() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#doughnut').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2) || 2;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      this.canvasCtx = ctx;
      this.canvasW = res[0].width;
      this.canvasH = res[0].height;
      this.drawChart();
    });
  },

  refresh() {
    if (!store.get()) return;
    this.renderBalance();
    this.renderExpenses();
    this.renderNecessities();
    this.renderWishes();
    this.drawChart();
  },

  recordsInRange(records, start, end) {
    const startTime = dateValue(start);
    const endTime = dateValue(end);
    return records.filter((record) => {
      const value = dateValue(record.date);
      return value >= startTime && value <= endTime;
    });
  },

  calculateAccountBalance(scope) {
    const data = store.get();
    const base = Number(data.accountBalances && data.accountBalances[scope]) || 0;
    return data.expenses.reduce((sum, record) => {
      if (record.scope !== scope) return sum;
      return sum + (record.type === 'income' ? record.amount : -record.amount);
    }, base);
  },

  sumRecords(records, type) {
    return records.filter((record) => record.type === type).reduce((sum, record) => sum + record.amount, 0);
  },

  renderBalance() {
    const data = store.get();
    const personal = this.calculateAccountBalance('personal');
    const family = this.calculateAccountBalance('family');
    const today = util.todayStr();
    const monthStart = util.ymd(util.monthStart());
    const todayRecords = this.recordsInRange(data.expenses, today, today);
    const monthRecords = this.recordsInRange(data.expenses, monthStart, today);
    this.setData({
      balance: util.formatMoney(personal + family),
      personalBalance: util.formatMoney(personal),
      familyBalance: util.formatMoney(family),
      statTodayExpense: util.formatMoney(this.sumRecords(todayRecords, 'expense')),
      statMonthExpense: util.formatMoney(this.sumRecords(monthRecords, 'expense')),
      statMonthIncome: util.formatMoney(this.sumRecords(monthRecords, 'income'))
    });
  },

  renderExpenses() {
    const data = store.get();
    const date = this.data.expenseDate;
    const scope = this.data.expenseScope;
    const list = data.expenses.reduce((result, record, idx) => {
      if (record.date !== date || (scope !== 'all' && record.scope !== scope)) return result;
      const isIncome = record.type === 'income';
      result.push({
        ...record,
        idx,
        color: util.getCatColor(record.cat, record.type),
        amountText: (isIncome ? '+' : '-') + util.formatMoney(record.amount),
        typeText: isIncome ? '收入' : '支出',
        typeClass: isIncome ? 'record-income' : 'record-expense'
      });
      return result;
    }, []);
    this.setData({ expenseDateLabel: util.formatDateLabel(date), expenseList: list });
  },

  renderNecessities() {
    const data = store.get();
    const total = data.necessities.reduce((sum, item) => sum + item.amount, 0);
    this.setData({
      necessityList: data.necessities.map((item) => ({ ...item, amountText: util.formatMoney(item.amount) })),
      necessityTotal: util.formatMoney(total)
    });
  },

  renderWishes() {
    const data = store.get();
    const scope = this.data.wishScope;
    const visible = data.wishes.filter((wish) => scope === 'all' || wish.ownerType === scope);
    const total = visible.reduce((sum, item) => sum + item.amount, 0);
    this.setData({
      wishList: visible.map((item) => ({
        ...item,
        amountText: util.formatMoney(item.amount),
        ownerText: item.ownerType === 'personal' ? '个人' : '家庭',
        ownerClass: item.ownerType === 'personal' ? 'scope-personal' : 'scope-family'
      })),
      wishTotal: util.formatMoney(total)
    });
  },

  onExpenseDateChange(e) {
    this.setData({ expenseDate: e.detail.value });
    this.renderExpenses();
  },

  selectExpenseScope(e) {
    this.setData({ expenseScope: e.currentTarget.dataset.scope });
    this.renderExpenses();
  },

  selectWishScope(e) {
    this.setData({ wishScope: e.currentTarget.dataset.scope });
    this.renderWishes();
  },

  selectChartPeriod(e) {
    this.setData({ chartPeriod: e.currentTarget.dataset.period });
    this.drawChart();
  },

  selectChartScope(e) {
    this.setData({ chartScope: e.currentTarget.dataset.scope });
    this.drawChart();
  },

  selectChartType(e) {
    this.setData({ chartType: e.currentTarget.dataset.type });
    this.drawChart();
  },

  onChartStartChange(e) {
    const start = e.detail.value;
    const end = this.data.chartEnd || util.todayStr();
    if (dateValue(start) > dateValue(end)) {
      wx.showToast({ title: '起始时间不能晚于截止时间', icon: 'none' });
      return;
    }
    this.setData({ chartStart: start, chartPeriod: 'custom' });
    this.drawChart();
  },

  onChartEndChange(e) {
    const end = e.detail.value;
    const start = this.data.chartStart || util.todayStr();
    if (dateValue(end) < dateValue(start)) {
      wx.showToast({ title: '截止时间不能早于起始时间', icon: 'none' });
      return;
    }
    this.setData({ chartEnd: end, chartPeriod: 'custom' });
    this.drawChart();
  },

  getChartRange() {
    const today = util.todayStr();
    const period = this.data.chartPeriod;
    if (period === 'today') return { start: today, end: today, label: '今日' };
    if (period === 'week') return { start: util.ymd(util.weekStart()), end: today, label: '本周' };
    if (period === 'month') return { start: util.ymd(util.monthStart()), end: today, label: '本月' };
    if (period === 'halfyear') {
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return { start: util.ymd(start), end: today, label: '近半年' };
    }
    const start = this.data.chartStart || today;
    const end = this.data.chartEnd || today;
    // 起止顺序由 onChartStartChange / onChartEndChange 校验保证，此处不再静默互换
    return { start, end, label: '自选' };
  },

  drawChart() {
    const ctx = this.canvasCtx;
    const data = store.get();
    if (!ctx || !data) return;
    const w = this.canvasW;
    const h = this.canvasH;
    const cx = w / 2;
    const cy = h / 2;
    const thickness = Math.min(w, h) * 0.16;
    const radius = Math.min(w, h) / 2 - thickness / 2 - 2;
    const range = this.getChartRange();
    const type = this.data.chartType;
    const cats = type === 'income' ? util.INCOME_CATS : util.EXPENSE_CATS;
    let filtered = this.recordsInRange(data.expenses, range.start, range.end).filter((record) => record.type === type);
    if (this.data.chartScope !== 'all') filtered = filtered.filter((record) => record.scope === this.data.chartScope);

    const totals = {};
    cats.forEach((item) => { totals[item.name] = 0; });
    filtered.forEach((record) => { totals[record.cat] = (totals[record.cat] || 0) + record.amount; });
    const total = filtered.reduce((sum, record) => sum + record.amount, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'butt';
    if (total <= 0) {
      ctx.strokeStyle = this.data.themeTrack;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      let start = -Math.PI / 2;
      cats.forEach((cat) => {
        const amount = totals[cat.name] || 0;
        if (amount <= 0) return;
        const angle = amount / total * Math.PI * 2;
        ctx.strokeStyle = cat.color;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, start + angle);
        ctx.stroke();
        start += angle;
      });
    }

    ctx.fillStyle = this.data.themeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(Math.min(w, h) * 0.16) + 'px sans-serif';
    ctx.fillText('¥' + Math.round(total), cx, cy - Math.min(w, h) * 0.04);
    ctx.fillStyle = type === 'income' ? '#22A06B' : '#D65757';
    ctx.font = '400 ' + Math.round(Math.min(w, h) * 0.09) + 'px sans-serif';
    ctx.fillText(range.label + (type === 'income' ? '收入' : '支出'), cx, cy + Math.min(w, h) * 0.12);

    this.setData({
      chartLegend: cats.map((cat) => ({
        name: cat.name,
        color: cat.color,
        amount: totals[cat.name] || 0,
        amountText: util.formatMoney(totals[cat.name] || 0)
      }))
    });
  },

  openAddModal(e) {
    const type = e.currentTarget.dataset.type;
    const recordType = e.currentTarget.dataset.recordType || 'expense';
    const titles = {
      expense: '记一笔支出',
      income: '记一笔收入',
      necessity: '添加刚需',
      wish: '添加愿望'
    };
    const cats = recordType === 'income' ? util.INCOME_CATS : util.EXPENSE_CATS;
    this.setData({
      modalType: type,
      modalTitle: titles[type] || '添加',
      modalName: '',
      modalAmount: '',
      modalRecordType: recordType,
      modalCat: cats[0].name,
      modalScope: 'personal',
      modalDate: util.todayStr(),
      cats: cats.map((item) => item.name)
    });
  },

  closeModal() { this.setData({ modalType: '' }); },
  selectCat(e) { this.setData({ modalCat: e.currentTarget.dataset.cat }); },
  selectScope(e) { this.setData({ modalScope: e.currentTarget.dataset.scope }); },
  onModalName(e) { this.setData({ modalName: e.detail.value }); },
  onModalAmount(e) { this.setData({ modalAmount: e.detail.value }); },
  onModalDate(e) { this.setData({ modalDate: e.detail.value }); },

  confirmAdd() {
    const type = this.data.modalType;
    const name = (this.data.modalName || '').trim();
    const amount = Number(this.data.modalAmount);
    // 收入允许名称选填；支出/刚需/愿望仍需名称
    if (type !== 'income' && !name) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!Number.isFinite(amount) || amount <= 0) return wx.showToast({ title: '请输入大于 0 的金额', icon: 'none' });

    const data = store.get();
    if (type === 'expense' || type === 'income') {
      data.expenses.push({
        date: this.data.modalDate || util.todayStr(),
        cat: this.data.modalCat,
        name,
        amount,
        scope: this.data.modalScope,
        type: this.data.modalRecordType
      });
    } else if (type === 'necessity') {
      data.necessities.push({ id: 'n' + Date.now(), name, amount, checked: false });
    } else if (type === 'wish') {
      data.wishes.push({
        id: 'w' + Date.now(),
        name,
        amount,
        checked: false,
        ownerType: this.data.modalScope
      });
    }
    store.save();
    this.setData({ modalType: '' });
    this.refresh();
  },

  deleteExpense(e) {
    const data = store.get();
    const idx = e.currentTarget.dataset.index;
    const record = data.expenses[idx];
    if (!record) return;
    if (record.refId) {
      const parts = record.refId.split('-');
      const type = parts.shift();
      const id = parts.join('-');
      const target = (type === 'necessity' ? data.necessities : data.wishes).find((item) => item.id === id);
      if (target) target.checked = false;
    }
    data.expenses.splice(idx, 1);
    store.save();
    this.refresh();
  },

  toggleCheck(e) {
    const type = e.currentTarget.dataset.type;
    const id = e.currentTarget.dataset.id;
    const data = store.get();
    const list = type === 'necessity' ? data.necessities : data.wishes;
    const item = list.find((entry) => entry.id === id);
    if (!item) return;
    item.checked = !item.checked;
    const refId = type + '-' + id;
    data.expenses = data.expenses.filter((record) => record.refId !== refId);
    if (item.checked) {
      data.expenses.push({
        date: util.todayStr(),
        cat: '日常用品',
        name: item.name,
        amount: item.amount,
        refId,
        scope: type === 'wish' ? item.ownerType : 'family',
        type: 'expense'
      });
    }
    store.save();
    this.refresh();
  },

  deleteNecessity(e) {
    const id = e.currentTarget.dataset.id;
    const data = store.get();
    data.expenses = data.expenses.filter((record) => record.refId !== 'necessity-' + id);
    data.necessities = data.necessities.filter((item) => item.id !== id);
    store.save();
    this.refresh();
  },

  deleteWish(e) {
    const id = e.currentTarget.dataset.id;
    const data = store.get();
    data.expenses = data.expenses.filter((record) => record.refId !== 'wish-' + id);
    data.wishes = data.wishes.filter((item) => item.id !== id);
    store.save();
    this.refresh();
  },

  editBalance() {
    const data = store.get();
    const account = 'personal';
    this.setData({
      showBalanceModal: true,
      balanceAccount: account,
      balanceInput: String((data.accountBalances && data.accountBalances[account]) || 0)
    });
  },

  selectBalanceAccount(e) {
    const account = e.currentTarget.dataset.account;
    const data = store.get();
    this.setData({
      balanceAccount: account,
      balanceInput: String((data.accountBalances && data.accountBalances[account]) || 0)
    });
  },

  closeBalance() { this.setData({ showBalanceModal: false }); },
  onBalanceInput(e) { this.setData({ balanceInput: e.detail.value }); },

  confirmBalance() {
    var value = Number(this.data.balanceInput);
    if (!Number.isFinite(value)) return wx.showToast({ title: '请输入有效数字', icon: 'none' });
    var data = store.get();
    if (!data.accountBalances) data.accountBalances = { personal: 0, family: 0 };

    var scope = this.data.balanceAccount;
    // 计算当前实际余额（用户看到的那个数）
    var currentBase = Number(data.accountBalances[scope]) || 0;
    var netFlow = data.expenses.reduce(function (sum, r) {
      if (r.scope !== scope) return sum;
      return sum + (r.type === 'income' ? r.amount : -r.amount);
    }, 0);
    var currentBalance = currentBase + netFlow;

    // 差额 = 用户期望 - 当前余额，将差额加到期初余额
    var delta = value - currentBalance;
    data.accountBalances[scope] = currentBase + delta;
    store.save();
    this.setData({ showBalanceModal: false });
    this.refresh();
  }
});
