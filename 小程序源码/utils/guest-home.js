// utils/guest-home.js - 首页游客浏览缓存与登录后的合并逻辑
const store = require('./store');

const GUEST_HOME_KEY = 'lifeapp_guest_home';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createGuestData() {
  const data = store.defaultData();
  return {
    userInfo: data.userInfo,
    lifeIndexOrder: data.lifeIndexOrder,
    lifeIndexData: data.lifeIndexData
  };
}

function normalize(data) {
  const fallback = createGuestData();
  const next = data && typeof data === 'object' ? data : fallback;
  if (!next.userInfo || typeof next.userInfo !== 'object') next.userInfo = fallback.userInfo;
  if (!Array.isArray(next.lifeIndexData)) next.lifeIndexData = fallback.lifeIndexData;
  if (!Array.isArray(next.lifeIndexOrder)) next.lifeIndexOrder = [];

  // 保留所有带 id 的板块（含用户自定义 custom_*），并为缺失字段补齐默认值
  next.lifeIndexData = (next.lifeIndexData || []).filter((item) => item && item.id);
  next.lifeIndexData.forEach((item) => {
    if (item.hidden === undefined) item.hidden = false;
    if (!item.type) item.type = item.id;
  });
  fallback.lifeIndexData.forEach((item) => {
    if (!next.lifeIndexData.some((current) => current.id === item.id)) {
      next.lifeIndexData.push({ ...item, data: [] });
    }
  });
  return next;
}

function get() {
  const raw = wx.getStorageSync(GUEST_HOME_KEY);
  if (!raw) {
    const data = createGuestData();
    save(data);
    return data;
  }

  try {
    return normalize(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch (e) {
    const data = createGuestData();
    save(data);
    return data;
  }
}

function save(data) {
  wx.setStorageSync(GUEST_HOME_KEY, JSON.stringify(normalize(clone(data))));
}

function getModule(data, id) {
  return (data.lifeIndexData || []).find((item) => item.id === id);
}

function mergeUniqueText(target, source) {
  source.forEach((item) => {
    if (!target.some((current) => current.text === item.text && current.deadline === item.deadline)) {
      target.push(clone(item));
    }
  });
}

function mergeCheckins(target, source) {
  source.forEach((item) => {
    const current = target.find((entry) => entry.name === item.name);
    if (!current) {
      target.push(clone(item));
      return;
    }
    const history = new Set([].concat(current.history || [], item.history || []));
    current.history = Array.from(history).sort();
  });
}

function mergeWeights(target, source) {
  source.forEach((item) => {
    if (!target.some((current) => current.date === item.date)) target.push(clone(item));
  });
  target.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// 合并仅针对首页数据；账号已有同名/同日期项目优先，防止覆盖正式记录。
function mergeToAccount(accountData) {
  const guest = get();
  if (!accountData || !Array.isArray(accountData.lifeIndexData)) return false;

  const accountInfo = accountData.userInfo || (accountData.userInfo = {});
  ['avatar', 'nickname', 'gender', 'age'].forEach((key) => {
    if (!accountInfo[key] && guest.userInfo && guest.userInfo[key]) accountInfo[key] = guest.userInfo[key];
  });

  ['todo', 'task'].forEach((id) => {
    const target = getModule(accountData, id);
    const source = getModule(guest, id);
    if (target && source) mergeUniqueText(target.data || (target.data = []), source.data || []);
  });

  const accountCheckin = getModule(accountData, 'checkin');
  const guestCheckin = getModule(guest, 'checkin');
  if (accountCheckin && guestCheckin) {
    mergeCheckins(accountCheckin.data || (accountCheckin.data = []), guestCheckin.data || []);
  }

  const accountWeight = getModule(accountData, 'weight');
  const guestWeight = getModule(guest, 'weight');
  if (accountWeight && guestWeight) {
    mergeWeights(accountWeight.data || (accountWeight.data = []), guestWeight.data || []);
  }

  return true;
}

function clear() {
  wx.removeStorageSync(GUEST_HOME_KEY);
}

module.exports = { get, save, mergeToAccount, clear, GUEST_HOME_KEY };
