// 云函数 getOpenid —— 返回调用者的微信 openid
// 小程序端通过 wx.cloud.callFunction({ name: 'getOpenid' }) 获取，用于订阅消息定向推送。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID || ''
  };
};
