/**
 * The demo script: every capability the classifier drives, as one-click presets.
 *
 * `from` is where the preset needs to be standing to make sense — the panel navigates
 * there first, then sends the message, so a refinement really refines something and an
 * action really has a list to act on. Nothing is typed during a demo.
 */
export interface Preset {
  /** The message sent to the classifier, verbatim. */
  text: string;
  /** Page to open before sending, when the preset only makes sense from there. */
  from?: string;
  /** What to watch for, shown under the chip. */
  watch: string;
}

export interface PresetGroup {
  title: string;
  /** The mechanism this group demonstrates. */
  hint: string;
  items: Preset[];
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    title: "導航",
    hint: "choice over pages → router.push",
    items: [
      { text: "回到儀表板", watch: "→ /dashboard" },
      { text: "各個組態基準的合規率", watch: "→ /gcb，不是主機列表" },
    ],
  },
  {
    title: "篩選",
    hint: "答案變成 URL 參數，跟點按鈕同一條路",
    items: [
      { text: "哪些主機離線很久了？", watch: "→ ?status=offline，且最久沒上線的在前" },
      { text: "有哪些 Windows 主機合規不合格", watch: "→ ?compliance=low&os=Windows" },
      { text: "只看重大風險的弱點", watch: "→ /vans?severity=critical" },
    ],
  },
  {
    title: "排序",
    hint: "模型選概念，頁面對應自己的欄位",
    items: [
      { text: "到風險管理CVSS從高到低排序", watch: "→ ?sort=cvss&dir=desc" },
      { text: "弱點依受影響主機數最多的排前面", watch: "→ ?sort=affected&dir=desc" },
    ],
  },
  {
    title: "追問",
    hint: "refinement noul：疊在目前的畫面上，不是重來",
    items: [
      {
        text: "再只看 Windows 的",
        from: "/assets?status=offline",
        watch: "保留 status=offline，加上 os=Windows；回覆寫「調整」",
      },
      {
        text: "這些改成合規率由低到高排",
        from: "/assets?status=offline&os=Windows",
        watch: "兩個篩選都留著，只換排序",
      },
    ],
  },
  {
    title: "指定主機",
    hint: "choice over host ids → 路由參數",
    items: [{ text: "TXG-PC-0001 的組態合規怎麼樣", watch: "→ /assets/H-1001" }],
  },
  {
    title: "時間範圍",
    hint: "同一個 ?since= 參數，兩個頁面共用",
    items: [
      { text: "本週的操作紀錄", watch: "→ /system/logs?since=week" },
      { text: "最近一個月公告的弱點", watch: "→ /vans?since=month" },
    ],
  },
  {
    title: "執行動作",
    hint: "choice over actions → 跑頁面註冊的 handler",
    items: [
      { text: "把目前這些主機匯出", from: "/assets?status=offline", watch: "真的下載 CSV" },
      {
        text: "存成常用視圖",
        from: "/vans?severity=critical",
        watch: "沒指定頁面也照做，就地存成 chip",
      },
    ],
  },
  {
    title: "危險動作",
    hint: "DESTRUCTIVE 表決定要不要問，不是模型",
    items: [
      {
        text: "封存這些離線主機",
        from: "/assets?status=offline",
        watch: "先問「要封存⋯⋯嗎？」，按確定才動手",
      },
      { text: "幫我建立派送", from: "/vans/patch", watch: "同樣先確認，之後出現派送批次" },
    ],
  },
  {
    title: "不該動作時",
    hint: "perform noul：問「可不可以」不等於叫你做",
    items: [
      { text: "這個頁面可以匯出嗎", from: "/assets", watch: "認出 export_csv 但不執行" },
      { text: "今天天氣如何", watch: "navigational 0.06，留在原地" },
    ],
  },
  {
    title: "不確定時",
    hint: "信心不足就交給你選，篩選與排序照樣帶過去",
    items: [
      { text: "風險", watch: "信心 0.52，給頁面按鈕，每個標明會帶什麼狀態" },
      { text: "合規的東西", watch: "信心 0.43，不猜，改成按鈕讓你選" },
    ],
  },
  {
    title: "緊急度",
    hint: "score 0–4 決定講話的音量",
    items: [
      { text: "所有主機都沒修補，很嚴重", watch: "urgency ≈ 3.4，回覆變紅" },
      { text: "看一下有幾台機器", watch: "urgency ≈ 0，普通回覆" },
    ],
  },
];
