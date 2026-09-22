/**
 * The behaviour this app promises, as data.
 *
 * `vp run eval` sends each message to the real classifier and checks the URL it produces
 * (`scripts/eval-intents.ts`). The same table is the place to add a case whenever a
 * question starts bleeding across pages — one line, then run the eval.
 */
export interface IntentCase {
  message: string;
  /** Expected `path?sorted=query`. `null` means: do not navigate. */
  expect: string | null;
  /** Where the user was when they said it, for refinement cases. */
  from?: string;
  /** Expected action id, when the message asks for one. Unset = not checked. */
  action?: string;
  note?: string;
}

export const INTENT_CASES: IntentCase[] = [
  // Plain navigation
  { message: "回到儀表板", expect: "/dashboard" },
  { message: "組織資訊在哪", expect: "/assets/org" },
  {
    message: "誰改了系統設定？",
    expect: "/system/logs",
    note: "audit trail, not the settings page",
  },
  { message: "修補進度到哪了", expect: "/vans/patch" },

  // Host list filters
  { message: "哪些主機離線很久了？", expect: "/assets?dir=asc&sort=lastSeen&status=offline" },
  { message: "有哪些 Windows 主機合規不合格", expect: "/assets?compliance=low&os=Windows" },
  { message: "列出所有主機", expect: "/assets" },

  // Vulnerability list: severity and ordering
  { message: "只看重大風險的弱點", expect: "/vans?severity=critical" },
  { message: "到風險管理CVSS從高到低排序", expect: "/vans?dir=desc&sort=cvss" },
  {
    message: "弱點依受影響主機數最多的排前面",
    expect: "/vans?dir=desc&sort=affected",
  },

  // One host by name
  { message: "TXG-PC-0001 的組態合規怎麼樣", expect: "/assets/H-1001" },

  // Cross-page bleed: these must NOT pick up host filters
  {
    message: "各個組態基準的合規率",
    expect: "/gcb",
    note: "compliance rolled up by baseline, no host filter",
  },
  { message: "有哪些帳號可以登入", expect: "/system/users" },

  // Time window
  { message: "本週的操作紀錄", expect: "/system/logs?since=week" },
  { message: "最近一個月公告的弱點", expect: "/vans?since=month" },

  // Refinement: builds on the view already open
  {
    message: "再只看 Windows 的",
    from: "/assets?status=offline",
    expect: "/assets?os=Windows&status=offline",
    note: "must keep status=offline",
  },

  // Actions, not pages
  { message: "把目前這些主機匯出", from: "/assets", expect: "/assets", action: "export_csv" },
  {
    message: "封存這些離線主機",
    from: "/assets?status=offline",
    expect: "/assets?status=offline",
    action: "archive_hosts",
  },
  {
    message: "幫我建立派送",
    from: "/vans/patch",
    expect: "/vans/patch",
    action: "create_dispatch",
  },

  // Asking about an action is not asking for it (the `perform` gate)
  {
    message: "這個頁面可以匯出嗎",
    from: "/assets",
    expect: "/assets",
    action: "none",
    note: "a question about the action, not an instruction",
  },

  {
    message: "存成常用視圖",
    from: "/vans?severity=critical",
    expect: null,
    action: "save_view",
    note: "no page named: page confidence is meaningless, the action still runs",
  },

  // Not navigation at all
  { message: "今天天氣如何", expect: null },
];
