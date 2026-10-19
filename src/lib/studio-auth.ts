export interface PendingClaim {
  anonymousUserId: string;
  token: string;
  /** The email that verified in this browser, used to avoid mixing accounts. */
  email?: string;
}

const EMAIL_KEY = "lamsa.studio.email";
const CLAIM_KEY = "lamsa.studio.claim";
const UNLOCK_KEY = "lamsa.studio.unlocked";

const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "121212",
  "112233",
  "102030",
]);

function read(storage: "local" | "session", key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage)
      .getItem(key);
  } catch {
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    const target =
      storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Private browsing can reject storage writes. The session still works for
    // this page; only the convenience hint is lost.
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isSixDigitPin(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function isWeakPin(value: string): boolean {
  return WEAK_PINS.has(value);
}

export function readEmailHint(): string | null {
  const value = read("local", EMAIL_KEY);
  return value && value.includes("@") ? value : null;
}

export function rememberEmail(email: string): void {
  write("local", EMAIL_KEY, normalizeEmail(email));
}

export function readUnlockedUser(): string | null {
  return read("session", UNLOCK_KEY);
}

export function markUnlocked(userId: string): void {
  write("session", UNLOCK_KEY, userId);
}

export function clearUnlocked(): void {
  write("session", UNLOCK_KEY, null);
}

export function readPendingClaim(): PendingClaim | null {
  const raw = read("local", CLAIM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingClaim>;
    if (
      typeof parsed.anonymousUserId === "string" &&
      typeof parsed.token === "string"
    ) {
      return {
        anonymousUserId: parsed.anonymousUserId,
        token: parsed.token,
        email: typeof parsed.email === "string" ? parsed.email : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function rememberPendingClaim(claim: PendingClaim): void {
  write("local", CLAIM_KEY, JSON.stringify(claim));
}

export function clearPendingClaim(): void {
  write("local", CLAIM_KEY, null);
}

/**
 * Convex includes the request prefix, a stack trace, and a client note on
 * auth actions. Keep only the sentence the provider actually threw so the PIN
 * and email screens stay calm and readable.
 */
export function authErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!raw) return "Something went wrong. Please try again.";

  const thrown = raw.match(/(?:Uncaught Error|ConvexError):\s*([^\n]+)/);
  if (thrown?.[1]) return thrown[1].trim();

  const line = raw
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) =>
      value
        .replace(/^\[[^\]]*\]\s*/g, "")
        .replace(/^Server Error\s*/i, "")
        .trim(),
    )
    .find(
      (value) =>
        value &&
        !value.startsWith("at ") &&
        !value.toLowerCase().startsWith("called by"),
    );

  return line || "Something went wrong. Please try again.";
}
