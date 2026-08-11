var auth = require('./utils/auth');
var store = require('./utils/store');
var cloud = require('./utils/cloud');
var theme = require('./utils/theme');

// 尝试从存储中恢复用户数据（用于 session 丢失但数据仍在的情况）
function tryRecoverUserData(app) {
  try {
    // 方法1：检查是否存有上次使用的 userId
    const lastUserId = wx.getStorageSync('lifeapp_last_active_user');
    if (lastUserId) {
      const raw = wx.getStorageSync('lifeapp_user_' + lastUserId);
      if (raw) {
        // 数据存在，尝试恢复
        const accounts = wx.getStorageSync('lifeapp_accounts') || [];
        const matched = accounts.find(function (a) { return a.userId === lastUserId; });
        if (matched) {
          app.globalData.userId = matched.userId;
          app.globalData.account = matched.account;
          wx.setStorageSync('lifeapp_session', { userId: matched.userId, account: matched.account });
          store.init(matched.userId);
          return true;
        }
      }
    }

    // 方法2：遍历账号列表，找第一个有数据的账号
    const accounts = wx.getStorageSync('lifeapp_accounts') || [];
    for (var i = accounts.length - 1; i >= 0; i--) {
      var acct = accounts[i];
      if (acct && acct.userId) {
        var raw = wx.getStorageSync('lifeapp_user_' + acct.userId);
        if (raw) {
          app.globalData.userId = acct.userId;
          app.globalData.account = acct.account;
          wx.setStorageSync('lifeapp_session', { userId: acct.userId, account: acct.account });
          store.init(acct.userId);
          return true;
        }
      }
    }
  } catch (e) {
    // 恢复失败，静默处理
  }
  return false;
}

App({
  globalData: {
    statusBarHeight: 20,
    userId: null,
    account: null,
    currentTheme: 'default'
  },

  onLaunch() {
    // 云开发只用于建议提交；未填写环境 ID 时仍可正常使用本地模式。
    cloud.init();

    // 读取状态栏高度，供自定义导航/头部做安全区适配
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.statusBarHeight = windowInfo.statusBarHeight || 20;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
    }

    // 恢复登录会话，并初始化当前用户的数据仓库
    var session = auth.getSession();
    if (session && session.userId) {
      this.globalData.userId = session.userId;
      this.globalData.account = session.account;
      store.init(session.userId);
      // 记录当前活跃用户，用于 session 丢失时的恢复
      wx.setStorageSync('lifeapp_last_active_user', session.userId);
    } else {
      // Session 丢失但用户数据可能还在 —— 尝试自动恢复
      tryRecoverUserData(this);
    }

    // 初始化主题配色
    var themeName = theme.getCurrentThemeName();
    this.globalData.currentTheme = themeName;
    theme.applyNavigationBar(themeName);
  },

  // 热启动：从后台切回前台时，确保数据仓库正确初始化
  onShow(options) {
    // 如果 store 未初始化（如 JS 上下文被回收），重新加载
    if (!store.get() && this.globalData.userId) {
      store.init(this.globalData.userId);
    }
    // 同步主题（热启动时页面可能重新渲染）
    var themeName = theme.getCurrentThemeName();
    this.globalData.currentTheme = themeName;
    theme.applyNavigationBar(themeName);
    theme.syncActivePages(themeName);
  }
});
