// 云函数 taskReminder —— 定时扫描并下发「任务到期提醒」订阅消息
//
// 触发方式：config.json 中的定时器（默认每 5 分钟一次）。
// 扫描 lifeIndex 集合（每个用户一篇文档，_id = userId），对满足以下条件的任务下发 1 条提醒：
//   - type === 'task' 且任务 remind === true（用户已授权订阅）
//   - 任务未完成（done !== true）
//   - 尚未推送过（reminded !== true）
//   - 截止日 <= 今天（到期当天或已逾期）—— 订阅消息为一次性，仅推送这一次
// 下发成功后置 reminded = true，避免重复推送。
//
// 接入前准备：
//   1) 在「微信公众平台 → 订阅消息 → 我的模板」申请「待办/日程提醒」类模板，把模板 ID 填入下方 TEMPLATE_ID；
//   2) 把下方 buildData 的字段名（thing1 / time2 / thing3）改成你申请模板对应的关键词；
//   3) 在开发者工具中右键本目录「上传并部署：云端安装依赖」。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// ← 在此填入你的订阅消息模板 ID（需与小程序端 utils/subscribe.js 中的 TASK_REMIND_TMPL_ID 一致）
const TEMPLATE_ID = '';
// 用户点击服务通知后打开的小程序页面
const PAGE = '/pages/index/index';

// 截断，避免超出模板字段长度
function truncate(str, n) {
  str = String(str == null ? '' : str);
  return str.length > n ? str.slice(0, n) : str;
}

// 构造订阅消息内容。字段名需与你申请的模板关键词一一对应。
function buildData(task) {
  return {
    thing1: { value: truncate(task.text, 20) }, // 任务名称
    time2: { value: task.deadline || '' }, // 截止时间
    thing3: { value: '你有一个任务即将到期，请及时处理' } // 备注
  };
}

// 今天 YYYY-MM-DD
function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

exports.main = async (event, context) => {
  if (!TEMPLATE_ID) {
    console.warn('[taskReminder] 未配置 TEMPLATE_ID，跳过发送');
    return { skipped: true, reason: 'no-template' };
  }

  const today = todayStr();
  let sent = 0;
  let skipped = 0;
  let docsScanned = 0;

  // 数据量较小时一次性取回；大数据量可加分页（.skip().limit()）
  const res = await db.collection('lifeIndex').limit(1000).get();
  const docs = res.data || [];

  for (const doc of docs) {
    docsScanned++;
    const modules = doc.modules || [];
    let changed = false;

    for (const m of modules) {
      if (m.type !== 'task' || !Array.isArray(m.data)) continue;
      for (const task of m.data) {
        if (!task || !task.remind || task.reminded || task.done) continue;
        // 仅在该任务到期当天（或已逾期未完成）推送
        if (!task.deadline || task.deadline > today) {
          skipped++;
          continue;
        }
        const openid = task.openid;
        if (!openid) {
          skipped++;
          continue;
        }
        try {
          await cloud.openapi.subscribeMessage.send({
            touser: openid,
            templateId: TEMPLATE_ID,
            page: PAGE,
            data: buildData(task)
          });
          task.reminded = true;
          task.remindedAt = Date.now();
          sent++;
          changed = true;
        } catch (e) {
          console.error('[taskReminder] 发送失败 openid=' + openid, e);
        }
      }
    }

    // 仅对有变更的任务写回，减少数据库写入
    if (changed) {
      await db
        .collection('lifeIndex')
        .doc(doc._id)
        .update({ data: { modules: modules } });
    }
  }

  return { sent, skipped, docsScanned };
};
