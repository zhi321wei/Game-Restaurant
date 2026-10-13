define("engine", function (module, exports, require) {
/**
 * 浪漫餐厅 · 规则引擎（纯函数，不碰状态）
 */
const cfg = require('./config.js');

const { CHAINS, GENS, BOARD, STAMINA, LEVEL, ORDER } = cfg;

const COLS = BOARD.cols;
const ROWS = BOARD.rows;
const BOARD_CELLS = COLS * ROWS;   // 全部格子都是棋盘格

// 生成器在棋盘内的固定格位（按解锁顺序）：贴左右两列分布，中间 5 列整片留给玩家操作
const GEN_SLOTS = [
  { row: 8, col: 0 },   // 咖啡机   Lv1  左下
  { row: 8, col: 6 },   // 面粉袋   Lv1  右下
  { row: 6, col: 0 },   // 工具箱   Lv2  左
  { row: 6, col: 6 },   // 海鲜箱   Lv3  右
  { row: 4, col: 0 },   // 花艺盆   Lv4  左
  { row: 4, col: 6 },   // 糖罐     Lv5  右
  { row: 2, col: 6 }    // 菜篮     Lv6  右上
];
const GEN_SLOT_INDEXES = GEN_SLOTS.map((g) => g.row * COLS + g.col);

// ---------------------------------------------------------------- 工具
function rnd(n) {
  return Math.floor(Math.random() * n);
}
function pick(arr) {
  return arr[rnd(arr.length)];
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function idx(row, col) {
  return row * COLS + col;
}
function rowOf(i) {
  return Math.floor(i / COLS);
}
function colOf(i) {
  return i % COLS;
}
function isBoardSlot(i) {
  return i >= 0 && i < BOARD_CELLS;
}
function isGenSlot(i) {
  return GEN_SLOT_INDEXES.indexOf(i) >= 0;
}

// ---------------------------------------------------------------- 等级 / 体力
function staminaMax(level) {
  return Math.min(STAMINA.hardMax, STAMINA.baseMax + (level - 1) * STAMINA.perLevel);
}

/** 依据离线时间恢复体力，返回 { value, at, gained } */
function recoverStamina(value, at, level, now) {
  const max = staminaMax(level);
  if (value >= max) return { value: max, at: now, gained: 0 };
  const elapsed = Math.max(0, now - (at || now));
  const gained = Math.floor(elapsed / STAMINA.recoverMs);
  if (gained <= 0) return { value, at: at || now, gained: 0 };
  const nv = Math.min(max, value + gained);
  const realGain = nv - value;
  const remainMs = elapsed - gained * STAMINA.recoverMs;
  return { value: nv, at: now - remainMs, gained: realGain };
}

/** 距离下一次恢复体力的毫秒数 */
function nextStaminaMs(at, now) {
  const elapsed = Math.max(0, now - (at || now));
  return STAMINA.recoverMs - (elapsed % STAMINA.recoverMs);
}

function expToNext(level) {
  return LEVEL.expOf(level);
}

// ---------------------------------------------------------------- 生成器
function unlockedGens(level) {
  return GENS.filter((g) => g.unlockLv <= level);
}

/** 生成器所在格 index（棋盘内固定格位） */
function genSlotIndex(order) {
  return GEN_SLOT_INDEXES[order] != null ? GEN_SLOT_INDEXES[order] : -1;
}

/** 点击生成器：决定产出等级 */
function rollDrop(level) {
  const r = Math.random();
  const p2 = clamp(0.06 + 0.018 * (level - 1), 0, 0.28);
  const p3 = clamp(0.008 * (level - 1), 0, 0.08);
  if (r < p3) return 3;
  if (r < p3 + p2) return 2;
  return 1;
}

/** 找离生成器最近的空格 */
function nearestEmpty(slots, genIndex) {
  const gc = colOf(genIndex);
  const gr = rowOf(genIndex);
  let best = -1;
  let bestD = 1e9;
  for (let i = 0; i < BOARD_CELLS; i++) {
    if (slots[i]) continue;
    // 曼哈顿距离，横向权重略高，让掉落更贴近生成器所在的那一侧
    const d = Math.abs(colOf(i) - gc) * 1.1 + Math.abs(rowOf(i) - gr) + rnd(3) * 0.01;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function firstEmpty(slots) {
  for (let i = 0; i < BOARD_CELLS; i++) if (!slots[i]) return i;
  return -1;
}

// ---------------------------------------------------------------- 订单
function itemValue(level) {
  return ORDER.coinPerLevel * Math.pow(level, 1.35);
}
function itemExp(level) {
  return ORDER.expPerLevel * level;
}

/**
 * 生成一个订单
 * @param {number} level 玩家等级
 * @param {Array<string>} unlockedChains 已解锁链
 */
function makeOrder(level, unlockedChains) {
  const prog = clamp(1 + Math.floor(level / 3), 1, 6);
  const count = level < 3 ? 1 : (Math.random() < 0.62 ? 2 : (Math.random() < 0.7 ? 2 : 3));
  const items = [];
  const usedChain = {};
  for (let k = 0; k < count; k++) {
    let chain = pick(unlockedChains);
    let guard = 0;
    while (usedChain[chain] && guard++ < 6) chain = pick(unlockedChains);
    usedChain[chain] = true;
    const maxLv = cfg.chainMax(chain);
    let lv = prog + rnd(2) - (Math.random() < 0.35 ? 1 : 0);
    if (level < 4) lv = Math.min(lv, 3);
    lv = clamp(lv, 1, Math.max(1, Math.min(maxLv, prog + 1)));
    const n = lv <= 2 ? (Math.random() < 0.5 ? 2 : 1) : 1;
    items.push({ id: cfg.itemId(chain, lv), n });
  }

  let coin = 0;
  let exp = 0;
  items.forEach((it) => {
    const lv = cfg.parseItemId(it.id).level;
    coin += itemValue(lv) * it.n;
    exp += itemExp(lv) * it.n;
  });
  const bonus = 1 + ORDER.bonusPerExtra * (items.length - 1);
  coin = Math.round(coin * bonus);
  exp = Math.round(exp * bonus);

  const ci = rnd(ORDER.customerIcons.length);
  return {
    id: 'o' + Date.now().toString(36) + rnd(999).toString(36),
    name: ORDER.customerNames[ci] || ORDER.customerNames[0],
    icon: ORDER.customerIcons[ci] || '🙂',
    line: pick(ORDER.customerLines || cfg.CUSTOMER_LINES),
    items,
    coin,
    exp,
    createdAt: Date.now()
  };
}

/** 判断订单是否可交付（棋盘上拥有足够物品） */
function orderProgress(slots, order) {
  const own = {};
  for (let i = 0; i < BOARD_CELLS; i++) {
    const s = slots[i];
    if (s && s.k === 'item') own[s.id] = (own[s.id] || 0) + 1;
  }
  let ok = true;
  const detail = order.items.map((it) => {
    const have = own[it.id] || 0;
    if (have < it.n) ok = false;
    return { id: it.id, n: it.n, have: Math.min(have, it.n) };
  });
  return { ok, detail };
}

// ---------------------------------------------------------------- 合并
/** 目标格是否可以放下/合并 */
function resolveDrop(slots, from, to, sourceId) {
  if (!isBoardSlot(to)) return { type: 'invalid' };
  if (from === to) return { type: 'none' };
  const src = slots[from];
  if (!src) return { type: 'invalid' };
  const dst = slots[to];
  if (!dst) return { type: 'move' };   // 生成器也能挪到空格
  // 只有两个「食材」之间才谈合并；凡是牵涉生成器的一律换位
  if (src.k === 'item' && dst.k === 'item') {
    if (dst.id === src.id) {
      const meta = cfg.getItemMeta(src.id);
      if (meta && meta.level < meta.max) return { type: 'merge' };
    }
    return { type: 'swap' };
  }
  return { type: 'swap' };
}

function mergeResultId(id) {
  const { chain, level } = cfg.parseItemId(id);
  return cfg.itemId(chain, level + 1);
}

/**
 * 找出棋盘上一对可合并的同类道具，优先等级最低的那一组（等级从低到高）。
 * 满级物品不能再合，直接跳过。
 * @returns {null|{id:string, level:number, from:number, to:number}} to 为合成后物品停留的格子
 */
function findMergePair(slots) {
  const groups = {};
  for (let i = 0; i < BOARD_CELLS; i++) {
    const s = slots[i];
    if (!s || s.k !== 'item') continue;
    if (!groups[s.id]) groups[s.id] = [];
    groups[s.id].push(i);
  }
  let best = null;
  Object.keys(groups).forEach((id) => {
    const list = groups[id];
    if (list.length < 2) return;
    const meta = cfg.getItemMeta(id);
    if (!meta || meta.level >= meta.max) return;
    if (!best || meta.level < best.level) {
      // 合并到靠前（左上）的那一格，另一格清空
      best = { id, level: meta.level, from: list[1], to: list[0] };
    }
  });
  return best;
}

/** 出售满级物品的价格 */
function sellPrice(id) {
  const { level } = cfg.parseItemId(id);
  return Math.round(34 * Math.pow(level, 1.6));
}

module.exports = {
  COLS, ROWS, BOARD_CELLS, GEN_SLOTS, GEN_SLOT_INDEXES,
  rnd, pick, clamp, idx, rowOf, colOf, isBoardSlot, isGenSlot,
  staminaMax, recoverStamina, nextStaminaMs, expToNext,
  unlockedGens, genSlotIndex, rollDrop, nearestEmpty, firstEmpty,
  makeOrder, orderProgress, itemValue, itemExp,
  resolveDrop, mergeResultId, findMergePair, sellPrice
};

});
