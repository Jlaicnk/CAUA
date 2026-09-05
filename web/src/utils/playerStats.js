// 29 个小项的分类展示元数据（中文 label + 所属分组 + 取值范围）
export const PLAYER_STAT_GROUPS = [
  {
    name: '进攻',
    items: [
      { key: 'attacking_awareness', label: '进攻意识' },
      { key: 'shooting', label: '射门' },
      { key: 'heading', label: '头球' },
      { key: 'set_play', label: '定位球' },
      { key: 'curl', label: '弧线球' },
    ],
  },
  {
    name: '传球',
    items: [
      { key: 'low_pass', label: '地面传球' },
      { key: 'lofted_pass', label: '空中传球' },
    ],
  },
  {
    name: '盘带 / 控球',
    items: [
      { key: 'ball_control', label: '控球' },
      { key: 'dribbling', label: '盘球' },
      { key: 'tight_control', label: '紧密控球' },
      { key: 'balance', label: '平衡' },
    ],
  },
  {
    name: '速度',
    items: [
      { key: 'speed', label: '速度' },
      { key: 'acceleration', label: '加速' },
    ],
  },
  {
    name: '身体 / 力量',
    items: [
      { key: 'kicking_power', label: '脚下力量' },
      { key: 'physical_contact', label: '身体接触' },
      { key: 'jumping', label: '跳跃' },
      { key: 'stamina', label: '体力' },
    ],
  },
  {
    name: '防守',
    items: [
      { key: 'defensive_awareness', label: '防守意识' },
      { key: 'ball_winning', label: '抢球' },
      { key: 'aggression', label: '积极性' },
    ],
  },
  {
    name: '守门员',
    items: [
      { key: 'gk_awareness', label: '守门员意识' },
      { key: 'gk_catching', label: '守门员接球能力' },
      { key: 'gk_clearing', label: '守门员解围' },
      { key: 'gk_reflexes', label: '守门员扑救反应' },
      { key: 'gk_reach', label: '守门员臂展' },
    ],
  },
  {
    name: '非惯用脚 / 状态 (0-5)',
    items: [
      { key: 'weak_foot_usage', label: '非惯用脚频率' },
      { key: 'weak_foot_accuracy', label: '非惯用脚精准度' },
      { key: 'condition', label: '状态持续性' },
      { key: 'injury_resistance', label: '抗受伤程度' },
    ],
  },
]

// 六大维度展示顺序 + key
export const DIMENSIONS = [
  { key: 'stat_shooting', label: '射门' },
  { key: 'stat_passing', label: '传球' },
  { key: 'stat_dribble', label: '盘带' },
  { key: 'stat_speed', label: '速度' },
  { key: 'stat_power', label: '力量' },
  { key: 'stat_defense', label: '防守' },
]
