// utils/subscribe.js - 微信订阅消息：任务到期提醒
//
// 工作原理（关键约束）：
// 1) 微信订阅消息为「一次性订阅」：用户每次授权，服务端只能向该用户下发 1 条对应模板的消息。
//    因此本功能对每个任务独立发起一次订阅授权，用于在该任务「到期当天」推送 1 条服务通知。
// 2) 真正下发消息必须由服务端完成（小程序端无法调用 subscribeMessage.send）。
//    下发逻辑放在云函数 taskReminder（定时触发），本文件只负责：
//      - 在用户点击铃铛时调用 wx.requestSubscribeMessage 请求授权（必须由用户手势触发）；
//      - 获取并缓存用户 openid，供云函数定向推送。
//
// 接入前准备（详见 README「任务到期提醒」章节）：
//  - 在「微信公众平台 → 订阅消息 → 我的模板」申请一个「待办/日程提醒」类模板；
//  - 把模板 ID 填到下方 TASK_REMIND_TMPL_ID；
//  - 在开发者工具中右键 cloudfunctions/getOpenid 与 cloudfunctions/taskReminder 上传并部署。

// ← 在此填入你在微信公众平台申请的「任务/日程提醒」订阅消息模板 ID
// 用 let 以便运行时/测试可通过 setTemplateId 覆盖（运营时直接改这里即可）。
let TASK_REMIND_TMPL_ID = '';

const OPENID_KEY = 'lifeapp_openid';

// 当前运行环境是否支持订阅消息 API
function isAvailable() {
  return !!(wx.requestSubscribeMessage && typeof wx.requestSubscribeMessage === 'function');
}

// 获取当前微信用户的 openid（供云函数定向推送），结果缓存到本地避免重复调用。
// 依赖云函数 getOpenid（已随本功能一并提供）。
function getOpenid() {
  const cached = wx.getStorageSync(OPENID_KEY);
  if (cached) return Promise.resolve(cached);
  if (!wx.cloud || !wx.cloud.callFunction) return Promise.reject(new Error('cloud not ready'));
  return wx.cloud
    .callFunction({ name: 'getOpenid' })
    .then((res) => {
      const openid = (res && res.result && res.result.openid) || '';
      if (openid) wx.setStorageSync(OPENID_KEY, openid);
      return openid;
    });
}

// 请求用户订阅「任务到期提醒」。返回 Promise<boolean>：用户是否同意授权。
// 注意：必须由用户手势（tap）触发调用，否则微信会拒绝弹窗。
function requestTaskReminder() {
  return new Promise((resolve) => {
    if (!isAvailable()) {
      resolve(false);
      return;
    }
    if (!TASK_REMIND_TMPL_ID) {
      // 未配置模板：开发阶段先提示，真实环境必须配置否则无法下发
      console.warn('[subscribe] 未配置 TASK_REMIND_TMPL_ID，订阅消息无法下发');
      resolve(false);
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [TASK_REMIND_TMPL_ID],
      success(res) {
        resolve(res[TASK_REMIND_TMPL_ID] === 'accept');
      },
      fail() {
        resolve(false);
      }
    });
  });
}

// 截断字符串到 n 个字符，避免超出订阅消息模板字段长度限制
function truncate(str, n) {
  str = String(str == null ? '' : str);
  return str.length > n ? str.slice(0, n) : str;
}

module.exports = {
  getTemplateId: () => TASK_REMIND_TMPL_ID,
  setTemplateId: (id) => { TASK_REMIND_TMPL_ID = id || ''; },
  OPENID_KEY,
  isAvailable,
  getOpenid,
  requestTaskReminder,
  truncate
};
