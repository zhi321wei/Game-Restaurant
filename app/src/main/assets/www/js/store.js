define("store", function (module, exports, require) {
/**
 * 熊家餐厅 · 状态与存档
 */
const cfg = require('./config.js');
const eng = require('./engine.js');
const { DECOR } = require('./decor.js');
const { CHAPTERS } = require('./story.js');

const SAVE_KEY = 'rr_save_v1';
const SAVE_VERSION = 3;   // v3：棋盘 7×9（v2：生成器改为棋盘内可拖动）

let state = null;
let saveTimer = null;

// ---------------------------------------------------------------- 初始状态
function emptySlots() {
  return new Array(eng.COLS * eng.ROWS).fill(null);
}

/**
 * 把已解锁的生成器放到棋盘内的固定格位上。
 * 若某个格位此刻正被食材占着（玩家把东西放在了未来的设备位上），
 * 优先把食材挪到最近的空格；棋盘实在满了就按售价折成金币，不让玩家白损失。
 */
function placeGens(slots, level, st) {
  const gens = eng.unlockedGens(level);
  let moved = 0;
  let refunded = 0;
  let coin = 0;
  gens.forEach((g, i) => {
    const idx = eng.genSlotIndex(i);
    if (idx < 0) return;
    // 玩家已经把这台设备拖到别处了：尊重玩家的布局，不再把它拽回默认位
    if (slots.some((s) => s && s.k === 'gen' && s.id === g.id)) return;
    const cur = slots[idx];
    let put = idx;
    if (cur && cur.k === 'item') {
      // 玩家把食材放在了未来的设备位上：优先挪走，实在没地方就折现
      const to = eng.nearestEmpty(slots, idx);
      if (to >= 0) {
        slots[to] = cur;
        moved += 1;
      } else {
        coin += eng.sellPrice(cur.id);
        refunded += 1;
      }
    } else if (cur && cur.k === 'gen') {
      // 默认位被另一台设备占着（多半是玩家拖过去的）：这台换个最近的空格，不去挤它
      const alt = eng.nearestEmpty(slots, idx);
      if (alt < 0) return;          // 棋盘满了，这台设备等下次腾出位置再进场
      put = alt;
    }
    slots[put] = { k: 'gen', id: g.id };
  });
  if (st && (moved || refunded)) {
    if (coin > 0) st.coin += coin;
    st.notice = { moved, refunded, coin };
  }
  return slots;
}

function newState() {
  const slots = placeGens(emptySlots(), 1);
  // 开局送几件基础食材
  const seeds = [
    { i: eng.idx(4, 2), id: 'coffee_1' },
    { i: eng.idx(4, 3), id: 'coffee_1' },
    { i: eng.idx(5, 3), id: 'bakery_1' },
    { i: eng.idx(5, 4), id: 'bakery_1' }
  ];
  seeds.forEach((s) => {
    slots[s.i] = { k: 'item', id: s.id };
  });

  const st = {
    version: SAVE_VERSION,
    lv: 1,
    exp: 0,
    coin: 150,
    stamina: eng.staminaMax(1),
    staminaAt: Date.now(),
    slots,
    orders: [],
    decor: {},          // decorId -> true
    decorStyle: {},     // v1.9 part -> style 1..3（每套家具三种风格）
    chapters: {},       // chapterId -> true
    clues: [],
    album: {},          // itemId -> true
    stats: { orders: 0, merges: 0, taps: 0, coin: 0 },
    pendingStory: null,
    tipDragGen: false,
    createdAt: Date.now(),
    lastAt: Date.now()
  };
  st.orders = [makeOrderFor(st), makeOrderFor(st), makeOrderFor(st)];
  return st;
}

function makeOrderFor(st) {
  const gens = eng.unlockedGens(st.lv);
  const chains = gens.map((g) => g.chain);
  return eng.makeOrder(st.lv, chains);
}

/**
 * 旧存档迁移：棋盘尺寸变了，等级/金币/装修/剧情/图鉴全部保留，
 * 棋盘上的食材按顺序搬进新棋盘（实在放不下才折现金币），设备重新摆位。
 */
function carryItems(oldSlots, st) {
  if (!Array.isArray(oldSlots)) return { refunded: 0, coin: 0 };
  let k = 0;
  let refunded = 0;
  let coin = 0;
  for (let i = 0; i < oldSlots.length; i++) {
    const s = oldSlots[i];
    if (!s || s.k !== 'item') continue;
    while (k < st.slots.length && st.slots[k]) k += 1;
    if (k >= st.slots.length) {
      coin += eng.sellPrice(s.id);
      refunded += 1;
      continue;
    }
    st.slots[k] = { k: 'item', id: s.id };
    k += 1;
  }
  if (coin > 0) st.coin += coin;
  return { refunded, coin };
}

function migrate(old) {
  const st = newState();
  st.lv = old.lv || 1;
  st.exp = old.exp || 0;
  st.coin = old.coin != null ? old.coin : st.coin;
  st.decor = old.decor || {};
  st.decorStyle = old.decorStyle || {};
  st.chapters = old.chapters || {};
  st.clues = old.clues || [];
  st.album = old.album || {};
  st.stats = old.stats || st.stats;
  st.tipDragGen = false;
  st.stamina = Math.min(old.stamina != null ? old.stamina : st.stamina, eng.staminaMax(st.lv));
  st.staminaAt = Date.now();
  const carried = carryItems(old.slots, st);
  placeGens(st.slots, st.lv, st);
  st.notice = { migrated: true, refunded: carried.refunded, coin: carried.coin };
  return st;
}

// ---------------------------------------------------------------- 存档
function load() {
  if (state) return state;
  try {
    const raw = wx.getStorageSync(SAVE_KEY);
    if (raw && raw.slots && raw.version === SAVE_VERSION && raw.slots.length === eng.COLS * eng.ROWS) {
      state = raw;
      // 兼容：补齐字段
      state.stats = state.stats || { orders: 0, merges: 0, taps: 0, coin: 0 };
      state.decor = state.decor || {};
      state.decorStyle = state.decorStyle || {};
      state.chapters = state.chapters || {};
      state.clues = state.clues || [];
      state.album = state.album || {};
      // 补齐这一版新加的生成器（花艺盆）等：已存在的设备不会被挪动
      placeGens(state.slots, state.lv, state);
    } else if (raw && raw.slots) {
      state = migrate(raw);
    } else {
      state = newState();
    }
  } catch (e) {
    state = newState();
  }
  save();
  return state;
}

function get() {
  return state || load();
}

function save() {
  if (!state) return;
  try {
    state.lastAt = Date.now();
    wx.setStorageSync(SAVE_KEY, state);
  } catch (e) {}
}

function saveLazy() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, 1200);
}

function reset() {
  state = newState();
  save();
  return state;
}

// ---------------------------------------------------------------- 图鉴
function markAlbum(id) {
  const st = get();
  if (!st.album[id]) {
    st.album[id] = true;
    return true;
  }
  return false;
}
function albumCount() {
  const st = get();
  return Object.keys(st.album).length;
}
function albumTotal() {
  return Object.keys(cfg.CHAINS).reduce((s, k) => s + cfg.CHAINS[k].items.length, 0);
}

// ---------------------------------------------------------------- 体力 / 时间
function tick() {
  const st = get();
  const now = Date.now();
  const r = eng.recoverStamina(st.stamina, st.staminaAt, st.lv, now);
  let changed = false;
  if (r.gained > 0) {
    st.stamina = r.value;
    st.staminaAt = r.at;
    changed = true;
  }
  // 订单空位自动补齐
  for (let i = 0; i < cfg.ORDER.slots; i++) {
    if (!st.orders[i]) {
      st.orders[i] = makeOrderFor(st);
      changed = true;
    }
  }
  if (changed) saveLazy();
  return { gained: r.gained };
}

// ---------------------------------------------------------------- 经验 / 升级
function addExp(n) {
  const st = get();
  st.exp += n;
  const ups = [];
  while (st.lv < cfg.LEVEL.maxLevel && st.exp >= eng.expToNext(st.lv)) {
    st.exp -= eng.expToNext(st.lv);
    st.lv += 1;
    ups.push(st.lv);
    // 升级：补满部分体力 + 解锁新生成器
    const max = eng.staminaMax(st.lv);
    st.stamina = Math.min(max, st.stamina + 10);
    placeGens(st.slots, st.lv, st);
  }
  if (ups.length) save();
  return ups;
}

function addCoin(n) {
  const st = get();
  st.coin += n;
  if (n > 0) st.stats.coin += n;
  saveLazy();
}

// ---------------------------------------------------------------- 生成器点击
/**
 * @returns {Object} { ok, reason?, slot?, itemId?, merged?, stamina }
 */
function tapGen(genOrder) {
  const st = get();
  tick();
  const gens = eng.unlockedGens(st.lv);
  const g = gens[genOrder];
  if (!g) return { ok: false, reason: 'locked' };
  if (st.stamina < cfg.STAMINA.costPerTap) return { ok: false, reason: 'stamina' };

  // 设备可以被玩家拖动，所以按 id 找它此刻所在的格子，而不是默认格位
  let gi = st.slots.findIndex((s) => s && s.k === 'gen' && s.id === g.id);
  if (gi < 0) gi = eng.genSlotIndex(genOrder);
  let target = eng.nearestEmpty(st.slots, gi);
  if (target < 0) target = eng.firstEmpty(st.slots);
  if (target < 0) return { ok: false, reason: 'full' };

  st.stamina -= cfg.STAMINA.costPerTap;
  st.staminaAt = st.staminaAt || Date.now();
  const lv = eng.rollDrop(st.lv);
  const id = cfg.itemId(g.chain, lv);
  st.slots[target] = { k: 'item', id };
  st.stats.taps += 1;
  markAlbum(id);
  saveLazy();
  return { ok: true, slot: target, itemId: id, genId: g.id, genSlot: gi, stamina: st.stamina };
}

// ---------------------------------------------------------------- 拖拽
/**
 * @returns {Object} { type: 'move'|'merge'|'swap'|'none'|'invalid', ... }
 */
function dragTo(from, to) {
  const st = get();
  const res = eng.resolveDrop(st.slots, from, to);
  if (res.type === 'none' || res.type === 'invalid') return res;
  if (res.type === 'move') {
    st.slots[to] = st.slots[from];
    st.slots[from] = null;
  } else if (res.type === 'swap') {
    const tmp = st.slots[to];
    st.slots[to] = st.slots[from];
    st.slots[from] = tmp;
  } else if (res.type === 'merge') {
    const nid = eng.mergeResultId(st.slots[from].id);
    st.slots[to] = { k: 'item', id: nid };
    st.slots[from] = null;
    st.stats.merges += 1;
    const isNew = markAlbum(nid);
    const bonus = Math.round(2 * cfg.parseItemId(nid).level);
    addCoin(bonus);
    res.newId = nid;
    res.bonus = bonus;
    res.isNew = isNew;
  }
  saveLazy();
  return res;
}

/**
 * 自动合成：按等级从低到高找出一对可合并的同类道具并合掉（一次点击合一对）。
 * @returns {{ok:boolean, reason?:string, slot?:number, newId?:string, name?:string, bonus?:number, isNew?:boolean}}
 */
function autoMerge() {
  const st = get();
  const pair = eng.findMergePair(st.slots);
  if (!pair) return { ok: false, reason: 'none' };
  const res = dragTo(pair.from, pair.to);
  if (res.type !== 'merge') return { ok: false, reason: 'fail' };
  const meta = cfg.getItemMeta(res.newId);
  return {
    ok: true,
    slot: pair.to,
    from: pair.from,
    newId: res.newId,
    name: meta ? meta.name : '',
    icon: meta ? meta.icon : '',
    level: pair.level + 1,
    bonus: res.bonus,
    isNew: res.isNew
  };
}

/**
 * 全自动合成：一次点击把棋盘上所有能合的都合完。
 * 每次循环仍走 findMergePair（等级从低到高），直到没有可合并的一对为止。
 * 每合一次棋盘上的物品总数 -1，所以循环必然收敛；额外加一个硬上限兜底防死循环。
 * @returns {{ok:boolean, reason?:string, count?:number, coin?:number, newCount?:number,
 *            topLevel?:number, topName?:string, topIcon?:string, slots?:number[], steps?:Array}}
 */
function autoMergeAll() {
  const st = get();
  const limit = eng.BOARD_CELLS * 2;   // 兜底
  const steps = [];
  const slots = [];
  let coin = 0;
  let newCount = 0;
  let topLevel = 0;
  let topName = '';
  let topIcon = '';
  for (let i = 0; i < limit; i++) {
    const r = autoMerge();
    if (!r.ok) break;
    steps.push({
      slot: r.slot,
      from: r.from,
      newId: r.newId,
      name: r.name,
      icon: r.icon,
      level: r.level,
      isNew: r.isNew
    });
    slots.push(r.slot);
    coin += r.bonus || 0;
    if (r.isNew) newCount += 1;
    if (r.level > topLevel) {
      topLevel = r.level;
      topName = r.name;
      topIcon = r.icon;
    }
  }
  if (!steps.length) return { ok: false, reason: 'none' };
  save();
  return { ok: true, count: steps.length, coin, newCount, topLevel, topName, topIcon, slots, steps };
}

/**
 * 花金币补体力：每次 +1 体力，消耗 1 金币（v1.10 起改为金币购买）。
 * 金币不足时不加体力；体力已满时不扣金币。
 * @returns {{ok:boolean, reason?:string, value:number, gained:number, cost:number, max:number}}
 */
function addStamina() {
  const st = get();
  tick();
  const cost = 1;
  const cap = Math.max(eng.staminaMax(st.lv), cfg.STAMINA.hardMax);
  if (st.stamina >= cap) return { ok: false, reason: 'full', value: st.stamina, gained: 0, cost: 0, max: eng.staminaMax(st.lv) };
  if (st.coin < cost) return { ok: false, reason: 'coin', value: st.stamina, gained: 0, cost, max: eng.staminaMax(st.lv) };
  const before = st.stamina;
  st.stamina = Math.min(cap, before + 1);
  st.coin -= cost;
  const gained = st.stamina - before;
  saveLazy();
  return { ok: true, value: st.stamina, gained, cost, max: eng.staminaMax(st.lv) };
}

// ---------------------------------------------------------------- 出售
function sell(slot) {
  const st = get();
  const s = st.slots[slot];
  if (!s || s.k !== 'item') return { ok: false };
  const meta = cfg.getItemMeta(s.id);
  if (meta.level < meta.max) return { ok: false, reason: 'low' };
  const price = eng.sellPrice(s.id);
  st.slots[slot] = null;
  addCoin(price);
  return { ok: true, price, name: meta.name, icon: meta.icon, id: s.id };
}

// ---------------------------------------------------------------- 订单
function orderState(order) {
  const st = get();
  return eng.orderProgress(st.slots, order);
}

/**
 * 交付订单：从棋盘上扣除物品
 */
function deliver(orderId) {
  const st = get();
  const i = st.orders.findIndex((o) => o && o.id === orderId);
  if (i < 0) return { ok: false };
  const order = st.orders[i];
  const prog = eng.orderProgress(st.slots, order);
  if (!prog.ok) return { ok: false, reason: 'lack' };

  // 扣除
  order.items.forEach((it) => {
    let need = it.n;
    for (let k = 0; k < eng.BOARD_CELLS && need > 0; k++) {
      const s = st.slots[k];
      if (s && s.k === 'item' && s.id === it.id) {
        st.slots[k] = null;
        need -= 1;
      }
    }
  });

  addCoin(order.coin);
  const ups = addExp(order.exp);
  st.stats.orders += 1;
  const total = st.stats.orders;
  st.orders[i] = makeOrderFor(st);
  save();

  return {
    ok: true,
    coin: order.coin,
    exp: order.exp,
    ups,
    total,
    newOrder: st.orders[i],
    index: i
  };
}

// ---------------------------------------------------------------- 装修
function decorStatus(d) {
  const st = get();
  if (st.decor[d.id]) return 'done';
  if (st.lv < d.unlockLv) return 'lock';
  const lack = [];
  d.req.forEach((r) => {
    let have = 0;
    for (let i = 0; i < eng.BOARD_CELLS; i++) {
      const s = st.slots[i];
      if (s && s.k === 'item' && s.id === r.id) have += 1;
    }
    if (have < r.n) lack.push({ id: r.id, n: r.n, have });
  });
  if (lack.length) return 'lack';
  if (st.coin < d.cost) return 'coin';
  return 'ready';
}

function countItem(id) {
  const st = get();
  let n = 0;
  for (let i = 0; i < eng.BOARD_CELLS; i++) {
    const s = st.slots[i];
    if (s && s.k === 'item' && s.id === id) n += 1;
  }
  return n;
}

function buildDecor(decorId) {
  const st = get();
  const d = DECOR.find((x) => x.id === decorId);
  if (!d) return { ok: false };
  if (st.decor[d.id]) return { ok: false, reason: 'done' };
  if (st.lv < d.unlockLv) return { ok: false, reason: 'lock' };
  if (st.coin < d.cost) return { ok: false, reason: 'coin' };
  // 扣物品
  d.req.forEach((r) => {
    let need = r.n;
    for (let i = 0; i < eng.BOARD_CELLS && need > 0; i++) {
      const s = st.slots[i];
      if (s && s.k === 'item' && s.id === r.id) {
        st.slots[i] = null;
        need -= 1;
      }
    }
  });
  st.coin -= d.cost;
  st.decor[d.id] = true;
  if (d.reward) {
    st.coin += d.reward.coin;
    addExp(d.reward.exp);
  }
  let clue = null;
  if (d.clue && st.clues.indexOf(d.clue) < 0) {
    st.clues.push(d.clue);
    clue = d.clue;
  }
  save();
  return { ok: true, decor: d, clue };
}

// ---------------------------------------------------------------- 剧情
/** 找出下一个满足触发条件且未播放的章节 */
function nextChapter() {
  const st = get();
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    if (st.chapters[c.id]) continue;
    const t = c.trigger;
    let hit = false;
    if (t.type === 'start') hit = true;
    else if (t.type === 'level') hit = st.lv >= t.value;
    else if (t.type === 'orders') hit = st.stats.orders >= t.value;
    else if (t.type === 'decor') hit = !!st.decor[t.value];
    if (hit) return c;
  }
  return null;
}

function hasPendingStory() {
  return !!nextChapter();
}

function finishChapter(id) {
  const st = get();
  st.chapters[id] = true;
  save();
}

/** 下一段剧情还差多少：用于交付后的进度提示 */
function storyGap() {
  const st = get();
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    if (st.chapters[c.id]) continue;
    const t = c.trigger;
    if (t.type === 'level') {
      const need = t.value - st.lv;
      if (need > 0) return '再升 ' + need + ' 级，解锁' + c.title;
    } else if (t.type === 'orders') {
      const need = t.value - st.stats.orders;
      if (need > 0) return '再交付 ' + need + ' 单，解锁' + c.title;
    } else if (t.type === 'decor') {
      const d = DECOR.find((x) => x.id === t.value);
      return '装修【' + (d ? d.name : '新区域') + '】后，解锁' + c.title;
    }
    return null; // 已满足条件（或 start 章），由剧情红点提示
  }
  return null;
}

function chapterProgress() {
  const st = get();
  return { done: Object.keys(st.chapters).length, total: CHAPTERS.length };
}

// ---------------------------------------------------------------- 小费（离线收益）
function offlineBonus() {
  const st = get();
  const now = Date.now();
  const gap = now - (st.lastAt || now);
  if (gap < 60000) return 0;
  const mins = Math.min(120, Math.floor(gap / 60000));
  const coin = Math.round(mins * (2 + st.lv * 0.8));
  if (coin > 0) {
    st.coin += coin;
    save();
  }
  return { mins, coin: gap >= 60000 ? coin : 0 };
}

// ---------------------------------------------------------------- 装修风格（v1.9）
/** 取某场景部件的当前风格（1..3），默认 1 */
function getDecorStyle(part) {
  const st = get();
  const n = st.decorStyle[part];
  return n >= 1 && n <= 3 ? n : 1;
}

/** 切换某场景部件的风格（仅该部件已装修时有效） */
function setDecorStyle(part, style) {
  const st = get();
  const d = DECOR.find((x) => x.part === part);
  if (!d || !st.decor[d.id]) return false;
  const n = Math.round(style);
  if (n < 1 || n > 3) return false;
  st.decorStyle[part] = n;
  save();
  return true;
}

module.exports = {
  SAVE_KEY,
  newState, load, get, save, saveLazy, reset,
  makeOrderFor,
  tick, addExp, addCoin, addStamina, tapGen, dragTo, sell, autoMerge, autoMergeAll,
  orderState, deliver, countItem,
  decorStatus, buildDecor, getDecorStyle, setDecorStyle,
  nextChapter, hasPendingStory, finishChapter, chapterProgress,
  storyGap,
  markAlbum, albumCount, albumTotal,
  offlineBonus
};

});
