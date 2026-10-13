define("config", function (module, exports, require) {
/**
 * 浪漫餐厅 · 核心配置
 * 合成链 / 生成器 / 体力 / 等级 / 订单规则
 *
 * 物品 id 规则：`${chainId}_${level}`，如 coffee_3
 */

// ---------------------------------------------------------------- 合成链
const CHAINS = {
  coffee: {
    id: 'coffee',
    name: '咖啡',
    gen: 'coffeeMachine',
    tint: '#a9714b',
    items: [
      { name: '咖啡豆', icon: '🫘' },
      { name: '咖啡粉', icon: '🟤' },
      { name: '浓缩', icon: '☕' },
      { name: '拿铁', icon: '🥛' },
      { name: '卡布奇诺', icon: '🧋' },
      { name: '冰美式', icon: '🥤' },
      { name: '手冲精品', icon: '🫖' }
    ]
  },
  bakery: {
    id: 'bakery',
    name: '烘焙',
    gen: 'flourBag',
    tint: '#d9a05b',
    items: [
      { name: '小麦', icon: '🌾' },
      { name: '面粉', icon: '🥣' },
      { name: '面团', icon: '🫓' },
      { name: '吐司', icon: '🍞' },
      { name: '牛角包', icon: '🥐' },
      { name: '三明治', icon: '🥪' },
      { name: '生日蛋糕', icon: '🎂' }
    ]
  },
  seafood: {
    id: 'seafood',
    name: '海鲜',
    gen: 'fishBox',
    tint: '#5aa9c9',
    items: [
      { name: '小虾', icon: '🦐' },
      { name: '鲜鱼', icon: '🐟' },
      { name: '生鱼片', icon: '🍣' },
      { name: '寿司拼盘', icon: '🍱' },
      { name: '螃蟹', icon: '🦀' },
      { name: '龙虾', icon: '🦞' },
      { name: '海鲜大餐', icon: '🍤' }
    ]
  },
  dessert: {
    id: 'dessert',
    name: '甜点',
    gen: 'sugarJar',
    tint: '#e8899e',
    items: [
      { name: '方糖', icon: '🍬' },
      { name: '奶油', icon: '🍦' },
      { name: '纸杯蛋糕', icon: '🧁' },
      { name: '甜甜圈', icon: '🍩' },
      { name: '曲奇', icon: '🍪' },
      { name: '布丁', icon: '🍮' },
      { name: '草莓蛋糕', icon: '🍰' }
    ]
  },
  garden: {
    id: 'garden',
    name: '鲜蔬',
    gen: 'vegBasket',
    tint: '#7cb86a',
    items: [
      { name: '种子', icon: '🌱' },
      { name: '生菜', icon: '🥬' },
      { name: '番茄', icon: '🍅' },
      { name: '黄瓜', icon: '🥒' },
      { name: '蔬菜沙拉', icon: '🥗' },
      { name: '果蔬拼盘', icon: '🥙' },
      { name: '鲜果塔', icon: '🍉' }
    ]
  },
  craft: {
    id: 'craft',
    name: '建材',
    gen: 'toolbox',
    tint: '#9a8b7a',
    items: [
      { name: '钉子', icon: '📌' },
      { name: '木板', icon: '🪵' },
      { name: '锤子', icon: '🔨' },
      { name: '油漆', icon: '🎨' },
      { name: '砖块', icon: '🧱' },
      { name: '吊灯', icon: '💡' },
      { name: '沙发', icon: '🛋️' }
    ]
  },
  flower: {
    id: 'flower',
    name: '花艺',
    gen: 'seedPot',
    tint: '#d97ba4',
    items: [
      { name: '水滴', icon: '💧' },
      { name: '幼苗', icon: '🌿' },
      { name: '花苞', icon: '🌸' },
      { name: '玫瑰', icon: '🌹' },
      { name: '郁金香', icon: '🌷' },
      { name: '花束', icon: '💐' },
      { name: '花瓶', icon: '🏺' }
    ]
  }
};

// ---------------------------------------------------------------- 生成器
// 生成器按 unlockLv 依次解锁，摆在棋盘内的固定格位上（见 engine.js 的 GEN_SLOTS）
// 注意：数组顺序必须按 unlockLv 升序，engine.js 的 GEN_SLOTS 按下标一一对应
const GENS = [
  { id: 'coffeeMachine', name: '咖啡机', icon: '☕', chain: 'coffee', unlockLv: 1 },
  { id: 'flourBag', name: '面粉袋', icon: '🌾', chain: 'bakery', unlockLv: 1 },
  { id: 'toolbox', name: '工具箱', icon: '🧰', chain: 'craft', unlockLv: 2 },
  { id: 'fishBox', name: '海鲜箱', icon: '🎣', chain: 'seafood', unlockLv: 3 },
  { id: 'seedPot', name: '花艺盆', icon: '🪴', chain: 'flower', unlockLv: 4 },
  { id: 'sugarJar', name: '糖罐', icon: '🍯', chain: 'dessert', unlockLv: 5 },
  { id: 'vegBasket', name: '菜篮', icon: '🧺', chain: 'garden', unlockLv: 6 }
];

// ---------------------------------------------------------------- 棋盘
// 生成器不再单独占一行，而是写在棋盘内的固定格位上（见 engine.js 的 GEN_SLOTS）
const BOARD = {
  cols: 7,
  rows: 9
};

// ---------------------------------------------------------------- 体力
const STAMINA = {
  baseMax: 60,
  perLevel: 4,
  hardMax: 160,
  recoverMs: 45000,   // 每 45 秒恢复 1 点
  costPerTap: 1
};

// ---------------------------------------------------------------- 等级
const LEVEL = {
  // 升到 lv+1 所需累计经验
  expOf(level) {
    return Math.round(60 * Math.pow(level, 1.55));
  },
  maxLevel: 40
};

// ---------------------------------------------------------------- 订单
const ORDER = {
  slots: 3,                 // 同时挂 3 个订单
  refreshMs: 45000,         // 空位自动刷新时间
  coinPerLevel: 26,         // 单件物品基础金币 = 26 * level^1.35
  expPerLevel: 12,
  bonusPerExtra: 0.35,      // 每多一件物品，整体奖励 +35%
  customerNames: [
    '艾米', '亨利', '奥利', '莉莉', '马克', '苏珊',
    '老船长', '卡特先生', '小海', '安妮', '露西', '汤姆'
  ],
  customerIcons: ['👩', '🧔', '👦', '👧', '🧑‍🦱', '👵', '🧓', '👨‍🦰', '👩‍🦳', '🧑‍🎨', '👩‍🍳', '🧑‍✈️'],
  customerFaces: ['f06', 'henry', 'f07', 'f08', 'f09', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16']
};

// ---------------------------------------------------------------- 顾客台词
const CUSTOMER_LINES = [
  '听说这家店重新开张了，我一定要来捧场！',
  '来一杯你最拿手的，我相信你的手艺。',
  '海风吹了一下午，肚子真的饿了。',
  '朋友推荐我来的，说这里的甜点一绝。',
  '我要打包带回去给女儿尝尝。',
  '和以前一样好吃，真的太好了。',
  '再来一份，我今天要好好犒劳自己。',
  '这家店，终于又有烟火气了。'
];

// ---------------------------------------------------------------- 工具函数
function itemId(chain, level) {
  return chain + '_' + level;
}

function parseItemId(id) {
  const p = String(id).split('_');
  return { chain: p[0], level: parseInt(p[1], 10) };
}

function getItemMeta(id) {
  const { chain, level } = parseItemId(id);
  const c = CHAINS[chain];
  if (!c) return null;
  const it = c.items[level - 1];
  if (!it) return null;
  return {
    id,
    chain,
    level,
    name: it.name,
    icon: it.icon,
    tint: c.tint,
    chainName: c.name,
    max: c.items.length
  };
}

function chainMax(chain) {
  return CHAINS[chain] ? CHAINS[chain].items.length : 0;
}

module.exports = {
  CHAINS,
  GENS,
  BOARD,
  STAMINA,
  LEVEL,
  ORDER,
  CUSTOMER_LINES,
  itemId,
  parseItemId,
  getItemMeta,
  chainMax
};

});
