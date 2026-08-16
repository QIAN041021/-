// utils/cloud.js - 微信云开发集中配置
// 请将 env 替换为微信开发者工具中创建的云环境 ID。
const CLOUD_ENV = 'cloud1-d2grn5us694be3dd9';

function isConfigured() {
  return !!(CLOUD_ENV && CLOUD_ENV !== '请填写云环境ID');
}

function init() {
  if (!isConfigured() || !wx.cloud || !wx.cloud.init) return false;
  wx.cloud.init({
    env: CLOUD_ENV,
    traceUser: true
  });
  return true;
}

function getEnv() {
  return CLOUD_ENV;
}

// 「今日生活指数」板块配置 + 记录数据，按 userId 作为文档 _id 存入云数据库。
// 集合名：lifeIndex；权限建议设为「仅创建者可读写」。
// uid 非当前用户时一律跳过，避免越权读写。

function syncLifeIndex(userId, modules) {
  if (!isConfigured() || !wx.cloud || !wx.cloud.database || !userId) return Promise.resolve(false);
  try {
    const db = wx.cloud.database();
    return db
      .collection('lifeIndex')
      .doc(userId)
      .set({
        data: {
          modules: modules,
          updatedAt: Date.now()
        }
      })
      .then(function () {
        return true;
      })
      .catch(function (err) {
        console.warn('[cloud] syncLifeIndex 失败', err);
        return false;
      });
  } catch (e) {
    console.warn('[cloud] syncLifeIndex 异常', e);
    return Promise.resolve(false);
  }
}

function fetchLifeIndex(userId) {
  if (!isConfigured() || !wx.cloud || !wx.cloud.database || !userId) return Promise.resolve(null);
  try {
    const db = wx.cloud.database();
    return db
      .collection('lifeIndex')
      .doc(userId)
      .get()
      .then(function (res) {
        return res && res.data ? res.data : null;
      })
      .catch(function () {
        // 文档不存在或无权限时返回 null（本地数据继续作为兜底）
        return null;
      });
  } catch (e) {
    return Promise.resolve(null);
  }
}

module.exports = { CLOUD_ENV, isConfigured, init, getEnv, syncLifeIndex, fetchLifeIndex };