define("decor", function (module, exports, require) {
/**
 * 熊家餐厅 · 装修节点
 * part: 对应餐厅场景中的元素；完成后场景点亮
 * req:  { id: 物品id, n: 数量 }
 */

const DECOR = [
  {
    id: 'floor',
    name: '橡木地板',
    desc: '踩上去会吱呀响的老地板，换掉它吧。',
    part: 'floor',
    unlockLv: 2,
    cost: 150,
    req: [{ id: 'craft_2', n: 3 }],
    reward: { coin: 40, exp: 30 }
  },
  {
    id: 'wall',
    name: '奶油色墙纸',
    desc: '发黄的墙面藏着旧时光，也藏着霉斑。',
    part: 'wall',
    unlockLv: 2,
    cost: 260,
    req: [{ id: 'craft_4', n: 3 }],
    reward: { coin: 60, exp: 45 }
  },
  {
    id: 'counter',
    name: '橡木吧台',
    desc: '妈妈当年就站在这里给客人冲咖啡。',
    part: 'counter',
    unlockLv: 3,
    cost: 420,
    req: [{ id: 'craft_3', n: 2 }, { id: 'craft_2', n: 4 }],
    reward: { coin: 90, exp: 70 }
  },
  {
    id: 'window',
    name: '海景落地窗',
    desc: '推开窗，浪尾岛的风就进来了。',
    part: 'window',
    unlockLv: 6,
    cost: 620,
    req: [{ id: 'craft_5', n: 3 }, { id: 'garden_2', n: 4 }],
    reward: { coin: 130, exp: 100 },
    clue: '窗台上有一串湿漉漉的黑色爪印。'
  },
  {
    id: 'seats',
    name: '玫瑰绒座椅',
    desc: '客人坐得舒服，才愿意多聊一会儿。',
    part: 'seats',
    unlockLv: 6,
    cost: 880,
    req: [{ id: 'flower_4', n: 3 }, { id: 'craft_2', n: 5 }],
    reward: { coin: 180, exp: 140 }
  },
  {
    id: 'lamp',
    name: '贝壳吊灯',
    desc: '暖黄色的光，是餐厅的心跳。',
    part: 'lamp',
    unlockLv: 6,
    cost: 1200,
    req: [{ id: 'craft_6', n: 2 }, { id: 'coffee_4', n: 2 }],
    reward: { coin: 240, exp: 190 }
  },
  {
    id: 'flowers',
    name: '窗台花艺',
    desc: '一束花，就能让陌生人笑起来。',
    part: 'flowers',
    unlockLv: 7,
    cost: 1600,
    req: [{ id: 'flower_5', n: 3 }, { id: 'flower_3', n: 4 }],
    reward: { coin: 320, exp: 250 }
  },
  {
    id: 'piano',
    name: '角落钢琴',
    desc: '妈妈留下的琴，好久没人弹了。',
    part: 'piano',
    unlockLv: 8,
    cost: 2200,
    req: [{ id: 'craft_7', n: 1 }, { id: 'craft_5', n: 5 }],
    reward: { coin: 420, exp: 330 },
    clue: '琴凳下压着一张被撕掉一半的进货单。'
  },
  {
    id: 'sign',
    name: '霓虹招牌',
    desc: '“Romantic Restaurant”——重新亮起来。',
    part: 'sign',
    unlockLv: 9,
    cost: 3000,
    req: [{ id: 'craft_6', n: 3 }, { id: 'dessert_5', n: 3 }],
    reward: { coin: 560, exp: 440 }
  },
  {
    id: 'terrace',
    name: '海景露台',
    desc: '在露台上吃饭，能一直看到日落。',
    part: 'terrace',
    unlockLv: 10,
    cost: 4200,
    req: [{ id: 'craft_7', n: 2 }, { id: 'flower_6', n: 3 }, { id: 'craft_5', n: 6 }],
    reward: { coin: 760, exp: 600 },
    clue: '露台木板缝里卡着一枚卡特家族的袖扣。'
  },
  {
    id: 'kitchen',
    name: '开放式厨房',
    desc: '让所有人看见，我们的食材干干净净。',
    part: 'kitchen',
    unlockLv: 12,
    cost: 6000,
    req: [{ id: 'craft_7', n: 3 }, { id: 'craft_6', n: 4 }, { id: 'seafood_5', n: 3 }],
    reward: { coin: 1000, exp: 800 }
  },
  {
    id: 'gardenArea',
    name: '后花园',
    desc: '种点薄荷和番茄，做菜时随手就摘。',
    part: 'gardenArea',
    unlockLv: 14,
    cost: 8500,
    req: [{ id: 'flower_6', n: 4 }, { id: 'flower_7', n: 1 }, { id: 'craft_5', n: 8 }],
    reward: { coin: 1400, exp: 1100 }
  },
  {
    id: 'blackcat',
    name: '黑猫的小窝',
    desc: '那只黑猫又来了，这次给它留个位置。',
    part: 'blackcat',
    unlockLv: 16,
    cost: 11000,
    req: [{ id: 'flower_7', n: 2 }, { id: 'craft_7', n: 3 }, { id: 'garden_6', n: 3 }],
    reward: { coin: 1900, exp: 1500 },
    clue: '黑猫颈圈里卷着一张纸条：别喝那批牛奶。'
  },
  {
    id: 'stage',
    name: '露台小舞台',
    desc: '开业那天，想请所有人上台说句话。',
    part: 'stage',
    unlockLv: 18,
    cost: 15000,
    req: [{ id: 'craft_7', n: 4 }, { id: 'dessert_7', n: 2 }, { id: 'coffee_7', n: 2 }],
    reward: { coin: 2600, exp: 2000 }
  }
];

// 场景元素：未完成时的灰调占位文案
const PART_HINT = {
  floor: '光秃秃的水泥地',
  wall: '斑驳的旧墙',
  counter: '倒塌的旧吧台',
  window: '钉死的木板窗',
  seats: '缺腿的椅子',
  lamp: '摇晃的灯泡',
  flowers: '空荡的窗台',
  piano: '盖着布的老钢琴',
  sign: '熄灭的招牌',
  terrace: '封住的侧门',
  kitchen: '上锁的后厨',
  gardenArea: '长草的后院',
  blackcat: '墙角的纸箱',
  stage: '堆杂物的角落'
};

module.exports = { DECOR, PART_HINT };

});
