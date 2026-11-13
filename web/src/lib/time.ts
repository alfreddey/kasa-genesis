/** Seconds as a clock a child can read: 5 -> "0:05", 83 -> "1:23". Bad values read as "0:00". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The same time in words for screen readers: 83 -> "1 minute 23 seconds". */
export function spokenTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0 seconds";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (rest > 0 || minutes === 0) parts.push(`${rest} second${rest === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/** What is left of a story, in short words: 150 -> "3 minutes left", under a minute -> "Almost done". */
export function timeLeft(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) return "Almost done";
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
}
