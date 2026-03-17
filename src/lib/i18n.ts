/**
 * Lightweight i18n for BrightCare OS — parent-facing multilingual support.
 *
 * Reflects Greater Vancouver demographics:
 * - English (default)
 * - Simplified Chinese (简体中文)
 * - Traditional Chinese (繁體中文)
 * - Punjabi (ਪੰਜਾਬੀ)
 * - Tagalog (Filipino)
 */

export type Locale = "en" | "zh-CN" | "zh-TW" | "pa" | "tl";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  pa: "ਪੰਜਾਬੀ",
  tl: "Tagalog",
};

/* ─── translation keys for parent-facing content ─── */

type TranslationKey =
  | "nav.home"
  | "nav.attendance"
  | "nav.billing"
  | "nav.daily_reports"
  | "nav.incidents"
  | "nav.messages"
  | "nav.announcements"
  | "nav.policies"
  | "nav.settings"
  | "common.loading"
  | "common.error"
  | "common.save"
  | "common.cancel"
  | "common.back"
  | "common.search"
  | "common.no_results"
  | "attendance.checked_in"
  | "attendance.checked_out"
  | "attendance.absent"
  | "attendance.present"
  | "billing.total"
  | "billing.paid"
  | "billing.balance"
  | "billing.overdue"
  | "billing.invoice"
  | "messages.new_message"
  | "messages.send"
  | "messages.no_messages"
  | "incidents.reported"
  | "incidents.severity"
  | "daily_reports.mood"
  | "daily_reports.meals"
  | "daily_reports.nap"
  | "daily_reports.activities"
  | "announcements.title"
  | "announcements.no_announcements"
  | "policies.acknowledge"
  | "policies.acknowledged"
  | "settings.language"
  | "settings.profile";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "nav.home": "Home",
    "nav.attendance": "Attendance",
    "nav.billing": "Billing",
    "nav.daily_reports": "Daily Reports",
    "nav.incidents": "Incidents",
    "nav.messages": "Messages",
    "nav.announcements": "Announcements",
    "nav.policies": "Policies",
    "nav.settings": "Settings",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.search": "Search",
    "common.no_results": "No results found",
    "attendance.checked_in": "Checked in",
    "attendance.checked_out": "Checked out",
    "attendance.absent": "Absent",
    "attendance.present": "Present",
    "billing.total": "Total",
    "billing.paid": "Paid",
    "billing.balance": "Balance",
    "billing.overdue": "Overdue",
    "billing.invoice": "Invoice",
    "messages.new_message": "New message",
    "messages.send": "Send",
    "messages.no_messages": "No messages yet",
    "incidents.reported": "Incident reported",
    "incidents.severity": "Severity",
    "daily_reports.mood": "Mood",
    "daily_reports.meals": "Meals",
    "daily_reports.nap": "Nap",
    "daily_reports.activities": "Activities",
    "announcements.title": "Announcements",
    "announcements.no_announcements": "No announcements",
    "policies.acknowledge": "I acknowledge this policy",
    "policies.acknowledged": "Acknowledged",
    "settings.language": "Language",
    "settings.profile": "Profile",
  },
  "zh-CN": {
    "nav.home": "首页",
    "nav.attendance": "出勤",
    "nav.billing": "账单",
    "nav.daily_reports": "每日报告",
    "nav.incidents": "事故",
    "nav.messages": "消息",
    "nav.announcements": "公告",
    "nav.policies": "政策",
    "nav.settings": "设置",
    "common.loading": "加载中...",
    "common.error": "发生错误",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.back": "返回",
    "common.search": "搜索",
    "common.no_results": "没有找到结果",
    "attendance.checked_in": "已签到",
    "attendance.checked_out": "已签退",
    "attendance.absent": "缺席",
    "attendance.present": "出勤",
    "billing.total": "总计",
    "billing.paid": "已付",
    "billing.balance": "余额",
    "billing.overdue": "逾期",
    "billing.invoice": "发票",
    "messages.new_message": "新消息",
    "messages.send": "发送",
    "messages.no_messages": "暂无消息",
    "incidents.reported": "事故已报告",
    "incidents.severity": "严重程度",
    "daily_reports.mood": "心情",
    "daily_reports.meals": "餐食",
    "daily_reports.nap": "午睡",
    "daily_reports.activities": "活动",
    "announcements.title": "公告",
    "announcements.no_announcements": "暂无公告",
    "policies.acknowledge": "我已阅读并同意此政策",
    "policies.acknowledged": "已确认",
    "settings.language": "语言",
    "settings.profile": "个人资料",
  },
  "zh-TW": {
    "nav.home": "首頁",
    "nav.attendance": "出勤",
    "nav.billing": "帳單",
    "nav.daily_reports": "每日報告",
    "nav.incidents": "事故",
    "nav.messages": "訊息",
    "nav.announcements": "公告",
    "nav.policies": "政策",
    "nav.settings": "設定",
    "common.loading": "載入中...",
    "common.error": "發生錯誤",
    "common.save": "儲存",
    "common.cancel": "取消",
    "common.back": "返回",
    "common.search": "搜尋",
    "common.no_results": "沒有找到結果",
    "attendance.checked_in": "已簽到",
    "attendance.checked_out": "已簽退",
    "attendance.absent": "缺席",
    "attendance.present": "出勤",
    "billing.total": "總計",
    "billing.paid": "已付",
    "billing.balance": "餘額",
    "billing.overdue": "逾期",
    "billing.invoice": "發票",
    "messages.new_message": "新訊息",
    "messages.send": "傳送",
    "messages.no_messages": "暫無訊息",
    "incidents.reported": "事故已報告",
    "incidents.severity": "嚴重程度",
    "daily_reports.mood": "心情",
    "daily_reports.meals": "餐食",
    "daily_reports.nap": "午睡",
    "daily_reports.activities": "活動",
    "announcements.title": "公告",
    "announcements.no_announcements": "暫無公告",
    "policies.acknowledge": "我已閱讀並同意此政策",
    "policies.acknowledged": "已確認",
    "settings.language": "語言",
    "settings.profile": "個人資料",
  },
  pa: {
    "nav.home": "ਘਰ",
    "nav.attendance": "ਹਾਜ਼ਰੀ",
    "nav.billing": "ਬਿਲਿੰਗ",
    "nav.daily_reports": "ਰੋਜ਼ਾਨਾ ਰਿਪੋਰਟ",
    "nav.incidents": "ਘਟਨਾਵਾਂ",
    "nav.messages": "ਸੁਨੇਹੇ",
    "nav.announcements": "ਐਲਾਨ",
    "nav.policies": "ਨੀਤੀਆਂ",
    "nav.settings": "ਸੈਟਿੰਗਜ਼",
    "common.loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    "common.error": "ਇੱਕ ਗਲਤੀ ਹੋਈ",
    "common.save": "ਸੇਵ ਕਰੋ",
    "common.cancel": "ਰੱਦ ਕਰੋ",
    "common.back": "ਵਾਪਸ",
    "common.search": "ਖੋਜ",
    "common.no_results": "ਕੋਈ ਨਤੀਜੇ ਨਹੀਂ ਮਿਲੇ",
    "attendance.checked_in": "ਚੈੱਕ ਇਨ ਹੋਇਆ",
    "attendance.checked_out": "ਚੈੱਕ ਆਊਟ ਹੋਇਆ",
    "attendance.absent": "ਗੈਰ-ਹਾਜ਼ਰ",
    "attendance.present": "ਹਾਜ਼ਰ",
    "billing.total": "ਕੁੱਲ",
    "billing.paid": "ਭੁਗਤਾਨ ਕੀਤਾ",
    "billing.balance": "ਬਕਾਇਆ",
    "billing.overdue": "ਬਕਾਇਆ ਮਿਤੀ ਲੰਘੀ",
    "billing.invoice": "ਬਿੱਲ",
    "messages.new_message": "ਨਵਾਂ ਸੁਨੇਹਾ",
    "messages.send": "ਭੇਜੋ",
    "messages.no_messages": "ਅਜੇ ਕੋਈ ਸੁਨੇਹਾ ਨਹੀਂ",
    "incidents.reported": "ਘਟਨਾ ਰਿਪੋਰਟ ਕੀਤੀ",
    "incidents.severity": "ਗੰਭੀਰਤਾ",
    "daily_reports.mood": "ਮੂਡ",
    "daily_reports.meals": "ਭੋਜਨ",
    "daily_reports.nap": "ਝਪਕੀ",
    "daily_reports.activities": "ਗਤੀਵਿਧੀਆਂ",
    "announcements.title": "ਐਲਾਨ",
    "announcements.no_announcements": "ਕੋਈ ਐਲਾਨ ਨਹੀਂ",
    "policies.acknowledge": "ਮੈਂ ਇਸ ਨੀਤੀ ਨੂੰ ਸਵੀਕਾਰ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ",
    "policies.acknowledged": "ਸਵੀਕਾਰ ਕੀਤਾ",
    "settings.language": "ਭਾਸ਼ਾ",
    "settings.profile": "ਪ੍ਰੋਫ਼ਾਈਲ",
  },
  tl: {
    "nav.home": "Home",
    "nav.attendance": "Attendance",
    "nav.billing": "Billing",
    "nav.daily_reports": "Pang-araw-araw na Ulat",
    "nav.incidents": "Mga Insidente",
    "nav.messages": "Mga Mensahe",
    "nav.announcements": "Mga Anunsyo",
    "nav.policies": "Mga Patakaran",
    "nav.settings": "Mga Setting",
    "common.loading": "Naglo-load...",
    "common.error": "May naganap na error",
    "common.save": "I-save",
    "common.cancel": "Kanselahin",
    "common.back": "Bumalik",
    "common.search": "Maghanap",
    "common.no_results": "Walang nahanap na resulta",
    "attendance.checked_in": "Naka-check in",
    "attendance.checked_out": "Naka-check out",
    "attendance.absent": "Absent",
    "attendance.present": "Present",
    "billing.total": "Kabuuan",
    "billing.paid": "Bayad na",
    "billing.balance": "Balanse",
    "billing.overdue": "Overdue",
    "billing.invoice": "Invoice",
    "messages.new_message": "Bagong mensahe",
    "messages.send": "Ipadala",
    "messages.no_messages": "Wala pang mga mensahe",
    "incidents.reported": "Nai-report ang insidente",
    "incidents.severity": "Kalubhaan",
    "daily_reports.mood": "Mood",
    "daily_reports.meals": "Pagkain",
    "daily_reports.nap": "Tulog",
    "daily_reports.activities": "Mga Aktibidad",
    "announcements.title": "Mga Anunsyo",
    "announcements.no_announcements": "Walang anunsyo",
    "policies.acknowledge": "Kinilala ko ang patakarang ito",
    "policies.acknowledged": "Kinilala",
    "settings.language": "Wika",
    "settings.profile": "Profile",
  },
};

const STORAGE_KEY = "brightcare.locale";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in translations) return stored as Locale;
  return "en";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
  window.dispatchEvent(new Event("locale-change"));
}

export function t(key: TranslationKey, locale?: Locale): string {
  const l = locale || getLocale();
  return translations[l]?.[key] || translations.en[key] || key;
}
