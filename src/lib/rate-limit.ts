type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();
export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = entries.get(key);
  if (!entry || entry.resetAt <= now) { entries.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= limit) return false;
  entry.count++; return true;
}
