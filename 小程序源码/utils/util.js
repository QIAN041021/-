// utils/util.js - 通用辅助函数

// 记账分类与配色（与原型保持一致）
const EXPENSE_CATS = [
  { name: '食', color: '#FF8C42' },
  { name: '日常用品', color: '#27AE60' },
  { name: '住', color: '#4A90D9' },
  { name: '衣', color: '#9B59B6' }
];

const INCOME_CATS = [
  { name: '工资', color: '#22A06B' },
  { name: '红包', color: '#E85D75' },
  { name: '兼职', color: '#3B82F6' },
  { name: '退款', color: '#7C5CE0' },
  { name: '其他收入', color: '#5C8D89' }
];

function getCatColor(catName, type) {
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const c = cats.find((item) => item.name === catName);
  return c ? c.color : '#999999';
}

// 今天，格式 YYYY-MM-DD
function todayStr() {
  const d = new Date();
  return ymd(d);
}

function ymd(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

// 把 YYYY-MM-DD 转成 "8月5日"
function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
}

// 本周一 00:00（周一为一周起点）
function weekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const ws = new Date(now);
  ws.setDate(now.getDate() - day + 1);
  ws.setHours(0, 0, 0, 0);
  return ws;
}

// 本月 1 号 00:00
function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// 最近 n 天窗口（含今天），由远到近排序，用于打卡日历
// 返回 [{ date:'YYYY-MM-DD', day:8, weekday:'六', isToday:false }, ...]
function lastNDays(n) {
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const today = todayStr();
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const date = ymd(dt);
    out.push({
      date: date,
      day: dt.getDate(),
      weekday: WEEK[dt.getDay()],
      isToday: date === today
    });
  }
  return out;
}

// 连续打卡天数计算
function calcStreak(history) {
  if (!history || !history.length) return 0;
  const sorted = history.slice().sort();
  const d = new Date();
  if (sorted.indexOf(todayStr()) === -1) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (true) {
    const ds = ymd(d);
    if (sorted.indexOf(ds) !== -1) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

// 金额格式化：¥1,234.00
function formatMoney(num) {
  const n = Number(num) || 0;
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 简易转义（小程序里主要防数据绑定异常，模板本身已做安全绑定，这里保留兼容）
function escapeHtml(text) {
  return String(text == null ? '' : text);
}

module.exports = {
  EXPENSE_CATS,
  INCOME_CATS,
  getCatColor,
  todayStr,
  ymd,
  formatDateLabel,
  weekStart,
  monthStart,
  lastNDays,
  calcStreak,
  formatMoney,
  escapeHtml
};
