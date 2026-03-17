/**
 * Map known Chinese API error messages to English equivalents.
 * These come from the backend until i18n is implemented there.
 */
const CN_TO_EN: Record<string, string> = {
  "无权为该孩子创建会话": "You do not have permission to create a conversation for this child.",
  "无权访问该会话": "You do not have permission to access this conversation.",
  "孩子不存在": "Child not found.",
  "会话不存在": "Conversation not found.",
  "消息不能为空": "Message cannot be empty.",
  "无权发送消息": "You do not have permission to send messages.",
  "未找到该孩子": "Child not found.",
  "未授权": "Unauthorized. Please sign in again.",
  "无权执行此操作": "You do not have permission to perform this action.",
  "出勤记录不存在": "Attendance record not found.",
  "签到失败": "Check-in failed.",
  "签退失败": "Check-out failed.",
  "该孩子已签到": "This child is already checked in.",
  "该孩子尚未签到": "This child has not checked in yet.",
};

/** Map HTTP/framework error messages to user-friendly English. */
const ERROR_REWRITES: Record<string, string> = {
  "ThrottlerException: Too Many Requests":
    "Too many attempts. Please wait a moment and try again.",
};

function translateError(msg: string): string {
  // Framework error rewrite (exact match)
  if (ERROR_REWRITES[msg]) return ERROR_REWRITES[msg];
  // Exact match (CN→EN)
  if (CN_TO_EN[msg]) return CN_TO_EN[msg];
  // Partial match — check if message contains any known Chinese phrase
  for (const [cn, en] of Object.entries(CN_TO_EN)) {
    if (msg.includes(cn)) return en;
  }
  return msg;
}

/**
 * Safely extract a human-readable message from an unknown caught value.
 * Replaces the `catch (e: any) { e?.message }` anti-pattern.
 * Also translates known Chinese backend errors to English.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error) return translateError(error.message);
  if (typeof error === "string") return translateError(error);
  return fallback;
}
