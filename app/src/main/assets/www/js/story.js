define("story", function (module, exports, require) {
/**
 * 浪漫餐厅 · 剧情
 * trigger: { type: 'start' | 'level' | 'decor' | 'orders', value }
 * who: kelly 凯莉 / girl 小豆 / henry 亨利 / nana 娜娜 / cat 黑猫 / narr 旁白
 */

const ROLES = {
  kelly: { name: '凯莉', avatar: '👩‍🦰', img: 'faces/kelly.jpg' },
  girl: { name: '小豆', avatar: '👧', img: 'faces/girl.jpg' },
  henry: { name: '亨利', avatar: '🧔', img: 'faces/henry.jpg' },
  nana: { name: '娜娜奶奶', avatar: '👵', img: 'faces/nana.jpg' },
  cat: { name: '黑猫', avatar: '🐈‍⬛', img: 'faces/cat.jpg' },
  narr: { name: '', avatar: '' }
};

const CHAPTERS = [
  {
    id: 'ch1',
    art: 'ch1.jpg',
    fx: 'sunset',
    caption: '末班船靠岸时，晚霞正落在妈妈的老房子上。',
    title: '第一章 · 回到浪尾岛',
    trigger: { type: 'start' },
    lines: [
      { who: 'narr', text: '离婚协议签完的那天下午，凯莉带着女儿小豆，坐上了回浪尾岛的末班船。' },
      { who: 'kelly', text: '十年了……妈妈留下的餐厅，居然变成了这样。' },
      { who: 'girl', text: '妈妈，这里有好多灰。我们真的要住这里吗？' },
      { who: 'kelly', text: '嗯。妈妈想把这里重新开起来——叫「浪漫餐厅」。' },
      { who: 'girl', text: '那我能当小服务员吗！' },
      { who: 'kelly', text: '当然。不过在那之前，我们得先把这里收拾干净。' },
      { who: 'narr', text: '墙角有什么东西动了一下。一双绿色的眼睛，在暗处静静地看着她们。' }
    ]
  },
  {
    id: 'ch2',
    art: 'ch2.jpg',
    fx: 'day',
    caption: '岛上的人认的是手艺，不是闲话。',
    title: '第二章 · 第一位客人',
    trigger: { type: 'level', value: 3 },
    lines: [
      { who: 'nana', text: '哟，这不是凯莉吗？你妈妈当年做的拿铁，我到现在都记得。' },
      { who: 'kelly', text: '娜娜奶奶……您还愿意来，真是太好了。' },
      { who: 'nana', text: '岛上都传遍啦，说你丈夫在外面有人，还把你的店掏空了。' },
      { who: 'kelly', text: '（苦笑）传得还挺快。' },
      { who: 'nana', text: '别怕。浪尾岛的人，认的是手艺，不是闲话。' }
    ]
  },
  {
    id: 'ch3',
    art: 'ch3.jpg',
    fx: 'mystery',
    caption: '一双绿色的眼睛，在暗处看了她们很久。',
    title: '第三章 · 地板下的声音',
    trigger: { type: 'decor', value: 'floor' },
    lines: [
      { who: 'kelly', text: '旧地板撬开的时候，下面居然是空的。' },
      { who: 'girl', text: '妈妈！里面有声音！' },
      { who: 'narr', text: '一只黑猫从地板夹层里钻出来，抖了抖身上的木屑，一点也不怕人。' },
      { who: 'cat', text: '喵。' },
      { who: 'kelly', text: '……你是从哪儿进来的？这房子明明一直锁着。' }
    ]
  },
  {
    id: 'ch4',
    art: 'ch4.jpg',
    fx: 'dusk',
    caption: '有些债，总要有人来还。',
    title: '第四章 · 卡特家族',
    trigger: { type: 'level', value: 5 },
    lines: [
      { who: 'henry', text: '晚上好。我是卡特家的亨利，岛上那家海鲜酒楼是我家的。' },
      { who: 'kelly', text: '卡特……我听说过这个名字。' },
      { who: 'henry', text: '令堂当年拒绝把餐厅卖给我父亲，后来她的店就出了事。' },
      { who: 'kelly', text: '你的意思是——' },
      { who: 'henry', text: '我只是觉得，事情不该就这么过去。我也是来还债的。' }
    ]
  },
  {
    id: 'ch5',
    art: 'ch5.jpg',
    fx: 'night',
    caption: '窗台上的湿爪印，把过去一路叼回了现在。',
    title: '第五章 · 窗台上的爪印',
    trigger: { type: 'decor', value: 'window' },
    lines: [
      { who: 'kelly', text: '新窗户装好了，可窗台上总有一串湿的爪印。' },
      { who: 'girl', text: '是黑猫！它每天晚上都来，还叼东西过来。' },
      { who: 'narr', text: '这次叼来的是一只空了的牛奶瓶，瓶身上贴着「卡特酒楼专用」的标签。' },
      { who: 'kelly', text: '……当年的那批牛奶。' }
    ]
  },
  {
    id: 'ch6',
    art: 'ch6.jpg',
    fx: 'mystery',
    caption: '半张撕掉的单据，藏着半句没说出口的话。',
    title: '第六章 · 进货单',
    trigger: { type: 'decor', value: 'piano' },
    lines: [
      { who: 'kelly', text: '琴凳下压着一张进货单，撕掉了一半。' },
      { who: 'henry', text: '剩下的那一半在我父亲的书房里。我见过。' },
      { who: 'kelly', text: '那你为什么不早说？' },
      { who: 'henry', text: '因为我也想知道，我家到底做了什么。' }
    ]
  },
  {
    id: 'ch7',
    art: 'ch7.jpg',
    fx: 'day',
    caption: '一枚袖扣，把那一夜的秘密留在了木缝里。',
    title: '第七章 · 露台上的袖扣',
    trigger: { type: 'decor', value: 'terrace' },
    lines: [
      { who: 'narr', text: '露台木板缝里，卡着一枚精致的袖扣，刻着字母 C。' },
      { who: 'henry', text: '这是我父亲的。他那一晚来过这里。' },
      { who: 'kelly', text: '所以真的是他。' },
      { who: 'henry', text: '凯莉，我会把完整的进货单拿给你。你值得知道真相。' }
    ]
  },
  {
    id: 'ch8',
    art: 'ch8.jpg',
    fx: 'warm',
    caption: '这一次，她是为自己干的活。',
    title: '第八章 · 老板娘',
    trigger: { type: 'level', value: 12 },
    lines: [
      { who: 'nana', text: '如今的浪漫餐厅，可比你妈妈当年还热闹。' },
      { who: 'kelly', text: '还差得远呢。我想让整个岛的人都来这儿吃顿饭。' },
      { who: 'girl', text: '妈妈现在笑起来，和以前不一样了！' },
      { who: 'kelly', text: '是吗……大概是因为，这次是给自己干活吧。' }
    ]
  },
  {
    id: 'ch9',
    art: 'ch9.jpg',
    fx: 'mystery',
    caption: '别喝那批牛奶。——妈妈留下的最后一句话。',
    title: '第九章 · 纸条',
    trigger: { type: 'decor', value: 'blackcat' },
    lines: [
      { who: 'narr', text: '黑猫的颈圈里卷着一张小小的纸条，字迹潦草：「别喝那批牛奶。」' },
      { who: 'kelly', text: '这是……妈妈的字。' },
      { who: 'girl', text: '所以黑猫一直在替外婆送信！' },
      { who: 'kelly', text: '它是妈妈养的猫。它带着我们知道答案。' },
      { who: 'cat', text: '喵——' }
    ]
  },
  {
    id: 'ch10',
    art: 'ch10.jpg',
    fx: 'dusk',
    caption: '沉默也是一种罪，而道歉需要时间。',
    title: '第十章 · 真相',
    trigger: { type: 'level', value: 16 },
    lines: [
      { who: 'henry', text: '完整的进货单在这里。那批牛奶被人换了，投毒的人是外包的供应商。' },
      { who: 'henry', text: '我父亲没有下毒，但他知道，却选择了沉默。' },
      { who: 'kelly', text: '沉默也是一种罪。' },
      { who: 'henry', text: '我知道。所以我辞掉了家里的职位，来这儿给你当采购。' },
      { who: 'kelly', text: '……欢迎加入，亨利。' }
    ]
  },
  {
    id: 'ch11',
    art: 'ch11.jpg',
    fx: 'party',
    caption: '浪漫，是把碎掉的东西一块一块拼回去。',
    title: '第十一章 · 重新亮起来',
    trigger: { type: 'decor', value: 'stage' },
    lines: [
      { who: 'narr', text: '开业那天晚上，露台的小舞台亮起了灯，整个浪尾岛的人都来了。' },
      { who: 'kelly', text: '这家餐厅叫「浪漫餐厅」。浪漫不是玫瑰和烛光……' },
      { who: 'kelly', text: '是自己把碎掉的东西，一块一块拼回去。' },
      { who: 'girl', text: '妈妈，黑猫也在听！' },
      { who: 'narr', text: '海风吹过来，招牌上的霓虹灯一闪一闪，像是在笑。' }
    ]
  },
  {
    id: 'ch12',
    art: 'ch12.jpg',
    fx: 'warm',
    caption: '一百位客人，一百个笑着离开的理由。',
    title: '第十二章 · 一百个订单',
    trigger: { type: 'orders', value: 100 },
    lines: [
      { who: 'nana', text: '第一百位客人满意地走了，凯莉，你做到了。' },
      { who: 'kelly', text: '不，是大家做到的。' },
      { who: 'kelly', text: '亨利采购、小豆端盘子、娜娜奶奶教我调酱汁……' },
      { who: 'kelly', text: '还有那只黑猫，它守了这个地方十年。' }
    ]
  }
];

module.exports = { CHAPTERS, ROLES };

});
