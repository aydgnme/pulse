import { Share } from 'react-native';

import { buildChallengeUrl } from './challengeLink';
import type { RunSnapshot } from './types';

export function shareMessage(score: number, isBest: boolean): string {
  const url = buildChallengeUrl(score);
  return isBest
    ? `My best streak in Pulse is ${score}. One tap, perfect timing — beat it: ${url}`
    : `I just scored ${score} in Pulse. One tap, perfect timing — beat it: ${url}`;
}

/**
 * The single owner of outbound delivery. Uses React Native's own Share
 * rather than expo-sharing: on iOS, Share.share({ message, url }) hands the
 * platform both the text (carrying the install link) and the image as
 * activity items, which is exactly what this feature needs. expo-sharing's
 * shareAsync has no way to attach text alongside an image on iOS — its
 * dialogTitle option is Android/web only there.
 *
 * Prefers the captured image; falls back to text-only when there is no
 * image (capture failed, or none was taken) or the image share itself
 * fails. Never throws: every failure degrades silently rather than
 * interrupting play.
 */
async function deliver(message: string, uri: string | null): Promise<void> {
  if (uri) {
    try {
      await Share.share({ message, url: uri });
      return;
    } catch {
      // fall through to the text-only share
    }
  }

  try {
    await Share.share({ message });
  } catch {
    // user dismissed the sheet, or sharing is unavailable (e.g. web)
  }
}

/** Shares a finished run: the captured card image plus text, or text alone. */
export async function shareRun(
  snapshot: RunSnapshot,
  uri: string | null,
): Promise<void> {
  const message = shareMessage(snapshot.score, snapshot.score >= snapshot.best);
  await deliver(message, uri);
}

/**
 * Text-only share of the player's best score, still carrying the install
 * link. Used from the menu, where there is no live run to render a card
 * from.
 */
export async function shareBest(score: number): Promise<void> {
  await deliver(shareMessage(score, true), null);
}
