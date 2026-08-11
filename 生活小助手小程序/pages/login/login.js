const auth = require('../../utils/auth');
const store = require('../../utils/store');
const guestHome = require('../../utils/guest-home');

function svg(content) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none">' + content + '</svg>'
  );
}
const LEAF =
  '<path d="M14 4C8 4 4 8 4 14C4 20 8 24 14 24C20 24 24 20 24 14C24 8 20 4 14 4Z" fill="#B0D9B1"/>' +
  '<path d="M14 8C11 8 9 11 9 14C9 17 11 20 14 20C17 20 19 17 19 14C19 11 17 8 14 8Z" fill="#8FCB90"/>' +
  '<path d="M14 8V20M9 14H19M11 11L17 17M17 11L11 17" stroke="#5E4B3C" stroke-width="1.2" stroke-linecap="round"/>';

function wxIconSvg() {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
    '<path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.5 4.7 3.8 6.1L4.5 21l4-2.1c.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z" fill="#07C160"/>' +
    '<circle cx="8" cy="10.5" r="1.2" fill="#fff"/><circle cx="15" cy="10.5" r="1.2" fill="#fff"/>' +
    '</svg>'
  );
}

Page({
  data: {
    mode: 'login',
    account: '',
    password: '',
    confirm: '',
    themeClass: 'default',
    brandIcon: '',
    wxIcon: ''
  },

  onLoad() {
    this.setData({ brandIcon: svg(LEAF), wxIcon: wxIconSvg() });
  },

  onShow() {
    const app = getApp();
    this.setData({ themeClass: (app.globalData.currentTheme || 'default') });
    // 已登录则直接进入首页
    const session = auth.getSession();
    if (session && session.userId) {
      store.init(session.userId);
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onAccountInput(e) {
    this.setData({ account: e.detail.value });
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },
  onConfirmInput(e) {
    this.setData({ confirm: e.detail.value });
  },

  afterLogin(userId, account) {
    const data = store.init(userId);
    // 将首页游客缓存按项目合并进当前账号，账号已有记录优先，避免覆盖正式数据。
    if (guestHome.mergeToAccount(data)) {
      store.save();
      guestHome.clear();
    }
    const app = getApp();
    app.globalData.userId = userId;
    app.globalData.account = account;
    wx.reLaunch({ url: '/pages/index/index' });
  },

  handleSubmit() {
    const { mode, account, password, confirm } = this.data;
    if (!account || !password) {
      wx.showToast({ title: '请填写账号和密码', icon: 'none' });
      return;
    }
    let r;
    if (mode === 'register') {
      if (password !== confirm) {
        wx.showToast({ title: '两次密码不一致', icon: 'none' });
        return;
      }
      r = auth.register({ account, password });
    } else {
      r = auth.login({ account, password });
    }
    if (!r.ok) {
      wx.showToast({ title: r.msg, icon: 'none' });
      return;
    }
    wx.showToast({ title: mode === 'register' ? '注册成功' : '登录成功', icon: 'success' });
    this.afterLogin(r.userId, r.account);
  },

  handleWechat() {
    wx.showLoading({ title: '登录中', mask: true });
    auth.wechatLogin().then((r) => {
      wx.hideLoading();
      if (!r.ok) {
        wx.showToast({ title: r.msg, icon: 'none' });
        return;
      }
      this.afterLogin(r.userId, r.account);
    });
  }
});
