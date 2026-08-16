// utils/auth.js - 注册 / 登录 / 会话管理
// 采用「本地账号」方案：账号密码保存在设备本地（无需后端即可长期保存并登录）。
// 注意：本地存储的密码仅为原型级哈希，生产环境请改用微信 openid + 云开发，避免明文风险。
// 详见 README 的「升级到云开发」章节。

const ACCOUNTS_KEY = 'lifeapp_accounts';
const SESSION_KEY = 'lifeapp_session';
const WX_ANON_KEY = 'lifeapp_wx_anon';

// 云托管/云函数鉴权开关。配置服务端后，登录 code 会优先用于换取可信 OpenID。
const OPENID_AUTH = {
  enabled: false,
  endpoint: '',
  cloudFunction: ''
};

function localWechatSession(code) {
  let anon = wx.getStorageSync(WX_ANON_KEY);
  if (!anon) {
    anon = 'wx_' + (code || Date.now().toString()) + Math.floor(Math.random() * 1e4).toString(36);
    wx.setStorageSync(WX_ANON_KEY, anon);
  }
  let account = getAccounts().find((x) => x.userId === anon);
  const accounts = getAccounts();
  if (!account) {
    account = { userId: anon, account: '微信用户', password: null };
    accounts.push(account);
    setAccounts(accounts);
  }
  setSession(anon, account.account);
  return { ok: true, userId: anon, account: account.account, source: 'local' };
}

function ensureOpenidAccount(openid) {
  const userId = 'openid_' + openid;
  let account = getAccounts().find((x) => x.userId === userId);
  const accounts = getAccounts();
  if (!account) {
    account = { userId, account: '微信用户', password: null };
    accounts.push(account);
    setAccounts(accounts);
  }
  setSession(userId, account.account);
  return { ok: true, userId, account: account.account, source: 'openid' };
}

function exchangeOpenid(code) {
  if (OPENID_AUTH.cloudFunction && wx.cloud && wx.cloud.callFunction) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({ name: OPENID_AUTH.cloudFunction, data: { code } }).then((res) => {
        const data = res.result || {};
        if (data.openid) resolve(data.openid);
        else reject(new Error('OpenID 响应无效'));
      }).catch(reject);
    });
  }

  if (OPENID_AUTH.endpoint) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: OPENID_AUTH.endpoint,
        method: 'POST',
        data: { code },
        header: { 'content-type': 'application/json' },
        success(res) {
          const data = res.data || {};
          if (res.statusCode >= 200 && res.statusCode < 300 && data.openid) resolve(data.openid);
          else reject(new Error(data.message || 'OpenID 交换失败'));
        },
        fail: reject
      });
    });
  }

  return Promise.reject(new Error('未配置 OpenID 鉴权服务'));
}

// 原型级哈希（非加密，仅用于本地校验，生产务必替换）
function hash(pw) {
  let h = 0;
  const s = String(pw || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(16);
}

function getAccounts() {
  return wx.getStorageSync(ACCOUNTS_KEY) || [];
}

function setAccounts(list) {
  wx.setStorageSync(ACCOUNTS_KEY, list);
}

function getSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function setSession(userId, account) {
  wx.setStorageSync(SESSION_KEY, { userId, account });
}

// 账号密码注册
function register({ account, password }) {
  account = (account || '').trim();
  if (!account) return { ok: false, msg: '请输入账号' };
  if (!password || password.length < 6) return { ok: false, msg: '密码至少 6 位' };

  const accounts = getAccounts();
  if (accounts.some((a) => a.account === account)) {
    return { ok: false, msg: '该账号已被注册' };
  }
  const userId = 'u_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  accounts.push({ userId, account, password: hash(password) });
  setAccounts(accounts);
  setSession(userId, account);
  return { ok: true, userId, account };
}

// 账号密码登录
function login({ account, password }) {
  account = (account || '').trim();
  const a = getAccounts().find((x) => x.account === account);
  if (!a) return { ok: false, msg: '账号不存在，请先注册' };
  if (a.password !== hash(password)) return { ok: false, msg: '密码错误' };
  setSession(a.userId, a.account);
  return { ok: true, userId: a.userId, account };
}

// 微信一键登录：优先调用云托管/云函数完成 code -> OpenID 交换；未启用时保持本地身份回退。
function wechatLogin() {
  return new Promise((resolve) => {
    wx.login({
      success(res) {
        if (!res.code) {
          resolve({ ok: false, msg: '未获取到微信登录凭证，请重试' });
          return;
        }

        if (!OPENID_AUTH.enabled) {
          resolve(localWechatSession(res.code));
          return;
        }

        exchangeOpenid(res.code)
          .then((openid) => resolve(ensureOpenidAccount(openid)))
          .catch(() => resolve({ ok: false, msg: '微信授权校验失败，请稍后重试' }));
      },
      fail() {
        resolve({ ok: false, msg: '微信登录失败，请重试或使用账号登录' });
      }
    });
  });
}

function logout() {
  wx.removeStorageSync(SESSION_KEY);
}

module.exports = { getSession, register, login, wechatLogin, logout, hash, OPENID_AUTH };
