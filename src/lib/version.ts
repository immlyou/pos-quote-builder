export const APP_VERSION = '1.2.1'

export interface ChangelogEntry {
  version: string
  date: string
  highlights: { zh: string; en: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.1',
    date: '2026-04-29',
    highlights: [
      {
        zh: '修正毛利徽章顯示 — 固定 $ 加成在數量 > 1 時顯示「總加成金額」（成本 + 徽章 = 客戶價），不再顯示誤導的單位加成',
        en: 'Fix margin badge display — fixed $ markup now shows total amount added (cost + badge = customer price) when qty > 1, no longer shows misleading per-unit value',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '每一品項新增毛利/加成欄位（% 或 $），右邊摘要面板即時顯示成本／毛利／客戶價',
        en: 'Per-line-item markup field (% or $); summary panel now shows cost / margin / customer prices live',
      },
      {
        zh: '匯出 Excel/PDF 內部模式新增「毛利摘要」區塊（客戶總價 / 成本 / 毛利金額 / 平均毛利率）',
        en: 'Internal-mode Excel/PDF exports now append a Margin Summary block',
      },
    ],
  },
  {
    version: '1.1.3',
    date: '2026-04-29',
    highlights: [
      {
        zh: '修正 PDF 抓錯 logo 檔的 bug（誤抓成產品照片）— 改用 drawing relationships 反查正確的 image7/image8.png',
        en: 'Fix PDF logo bug (was extracting product photos instead of logos) — now traces drawing relationships to map the correct image files',
      },
      {
        zh: 'PDF logo 尺寸調整為符合原始長寬比',
        en: 'PDF logo dimensions adjusted to match original aspect ratios',
      },
    ],
  },
  {
    version: '1.1.2',
    date: '2026-04-29',
    highlights: [
      {
        zh: 'PDF 匯出加上左右兩個 logo（左：Partner Tech 主 logo / 右：BenQ Group），與 Excel 模板一致',
        en: 'PDF export now shows both header logos (left: Partner Tech / right: BenQ Group), matching the Excel template',
      },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-04-29',
    highlights: [
      {
        zh: '修正 Excel 匯出時 Remark 條款被複製到多個欄位的視覺 bug — 改用 footer snapshot/replay 重建合併儲存格',
        en: 'Fix Excel export bug where Remark terms appeared duplicated across columns — footer is now snapshot/replayed to preserve merged cells',
      },
      {
        zh: 'TOTAL 列調整為「右靠價格欄」呈現，與週邊報價視覺一致',
        en: 'TOTAL row label now sits right-aligned next to the price column for visual consistency',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: 'Excel / PDF 匯出改用 PTAP 官方模板填值（不再自繪版面）',
        en: 'Excel / PDF exports now fill the official PTAP template (no more drawn layouts)',
      },
      {
        zh: '兩個 header logo 自動保留（左 Partner Tech、右 BenQ Group）；自訂 logo 只取代左側',
        en: 'Both header logos preserved (left: Partner Tech, right: BenQ Group); custom logo replaces left only',
      },
      {
        zh: 'PTC 分頁中段產品圖自動清掉，避免列印外洩',
        en: 'Mid-page product images on PTC sheet auto-stripped to avoid leaking on print',
      },
      {
        zh: '新增報價公司主體切換（PTT 台灣亞太 / PTC 上海），條款自動套對應版本',
        en: 'Added quote entity switcher (PTT / PTC) with auto-applied remark terms',
      },
      {
        zh: '新增「顯示內部成本」開關，預設關閉避免成本/毛利欄位外露',
        en: 'Added "Include internal costs" toggle, off by default to hide cost/margin from clients',
      },
      {
        zh: '主機 + 週邊以 1 / 1.1 / 1.2 階層編號呈現，符合原模板分組樣式',
        en: 'Items hierarchically numbered 1 / 1.1 / 1.2 with peripheral group headers matching template',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '客戶 360° 詳情頁：報價時間軸 + 勝率 / 平均回覆天數 / 冷熱徽章',
        en: 'Customer 360° page: quote timeline + win rate / avg respond days / heat badge',
      },
      {
        zh: '客戶標籤系統：自由標籤 + 列表頁標籤篩選',
        en: 'Customer tags: free-form labels + tag filter on list page',
      },
      {
        zh: '報價跟進日期 + 儀表板「今日要追」widget（逾期紅標）',
        en: 'Quote next-follow-up + dashboard "Today\'s follow-ups" widget (overdue red)',
      },
      {
        zh: '報價瀏覽追蹤：客戶開啟分享連結時記錄次數 + 時間',
        en: 'Quote view tracking: counts views + last viewed time when share link opened',
      },
      {
        zh: '修訂版本價差視覺化（v2 vs v1 降價 / 加價）',
        en: 'Revision price diff visualization (v2 vs v1 drop / up)',
      },
      {
        zh: '平均成交天數 KPI（sent → accepted 時長）',
        en: 'Average days to close KPI (sent → accepted duration)',
      },
      {
        zh: '報價詳情頁活動條：瀏覽 / 發出 / 寄信 / 回覆 4 個時間戳',
        en: 'Quote detail activity strip: views / sent / emailed / responded 4 timestamps',
      },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: 'PDF 重新設計：Bill To 區塊、條款、簽名欄、頁碼、Valid Until',
        en: 'PDF redesigned: Bill To, T&C, signature blocks, page numbers, Valid Until',
      },
      {
        zh: '公開分享連結：產生 token URL 給客戶線上接受 / 拒絕',
        en: 'Public share links: token URL lets customers accept/reject online',
      },
      {
        zh: 'Email 寄送（Resend）：附上 PDF + 分享連結，需設定 RESEND_API_KEY',
        en: 'Email via Resend: attaches PDF + share link, requires RESEND_API_KEY',
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '營運儀表板：本月成交 / 在案 / 勝率 / 累計營收 4 大 KPI',
        en: 'Business dashboard: 4 KPIs — month won, pipeline, win rate, lifetime revenue',
      },
      {
        zh: '6 個月趨勢柱狀圖（總額 vs 成交）',
        en: '6-month trend bar chart (total vs accepted)',
      },
      {
        zh: '狀態漏斗 + Top 5 客戶 + 業務員績效表',
        en: 'Status funnel + Top 5 customers + salesperson scoreboard',
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '客戶名稱欄位自動補全（從客戶 DB 撈建議）',
        en: 'Customer name auto-complete (suggestions from customer DB)',
      },
      {
        zh: '報價詳情頁新增「複製」按鈕，一鍵 duplicate 含選項',
        en: 'Duplicate button on detail page — one-click copy with all selections',
      },
      {
        zh: '數量輸入支援千分位顯示，避免大數字看錯位數',
        en: 'Qty input shows thousands separator to prevent misreads',
      },
      {
        zh: 'Vercel Cron：每日午夜自動把 sent + 已過期的報價標為 expired',
        en: 'Vercel Cron: daily midnight job flips sent quotes past expiry to expired',
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '客戶管理頁：CRUD、自訂客戶代碼、累計報價數 / 總金額 / 最近報價',
        en: 'Customer management page: CRUD, custom codes, quote count / total value / last quote',
      },
      {
        zh: '報價狀態看板：6 欄 Kanban 視覺化，下拉一鍵切換狀態',
        en: 'Quote status board: 6-column kanban with one-click status moves',
      },
      {
        zh: '導覽列新增「看板」與「客戶」頁籤',
        en: 'Navbar adds Board and Customers tabs',
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '報價詳情頁新增「編輯」按鈕，將既有報價載入主畫面修改',
        en: 'Edit button on detail page reloads quote into main configurator',
      },
      {
        zh: '主畫面進入編輯模式時顯示橘色 banner，並提供兩種儲存模式',
        en: 'Edit-mode banner on main panel with two save options',
      },
      {
        zh: '「更新此版本」直接覆蓋；「儲存為新版本」自動掛 parent_quote_id 並產生 -r2 編號',
        en: 'Update saves in-place; Save-as-new-revision creates a child quote with parent linkage and -r2 quote number',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '報價歷史頁：列表 + 篩選（客戶 / 狀態 / 日期）',
        en: 'Quote history page: list with filters (customer / status / date)',
      },
      {
        zh: '報價詳情頁：完整明細、狀態切換、刪除',
        en: 'Quote detail page: full line items, status update, delete',
      },
      {
        zh: '主畫面新增「儲存報價」按鈕，自動建立 / 連結客戶',
        en: 'Save Quote button on main panel, auto-create / link customer',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '報價資料庫上雲：Neon Postgres 整合、首頁改為 runtime 讀取',
        en: 'Catalog moved to cloud: Neon Postgres integration, runtime catalog loading',
      },
      {
        zh: '設定頁新增 Excel (.xlsx) 上傳，可線上更新報價資料庫',
        en: 'Settings page now supports Excel (.xlsx) upload to refresh the catalog online',
      },
      {
        zh: 'TypeScript 取代 Python parser，無需本機 build step',
        en: 'TypeScript parser replaces Python — no local build step needed',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-29',
    highlights: [
      {
        zh: '初版上線：報價配置器、PDF / Excel 匯出、公司抬頭管理、雙語切換',
        en: 'Initial release: quote configurator, PDF / Excel export, company profile manager, zh / en locale switch',
      },
      {
        zh: '部署至 Vercel、行動裝置 RWD 排版',
        en: 'Deployed to Vercel, mobile-friendly responsive layout',
      },
    ],
  },
]
