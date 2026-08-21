// Builds and reads the challenge links carried in shared score cards.
// The link carries a score and nothing else — no identity, no session.

export const CHALLENGE_HOST = 'pulse.aydgn.me';

const CHALLENGE_PATH = /^\/c\/(\d+)$/;

export function buildChallengeUrl(score: number): string {
  const n = Math.max(0, Math.floor(score));
  return `https://${CHALLENGE_HOST}/c/${n}`;
}

/** Returns the challenged score, or null if this is not a challenge link. */
export function parseChallengeUrl(url: string): number | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== CHALLENGE_HOST) return null;
  const match = CHALLENGE_PATH.exec(parsed.pathname);
  if (!match) return null;
  const score = Number(match[1]);
  return Number.isSafeInteger(score) ? score : null;
}
