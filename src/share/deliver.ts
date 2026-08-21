import * as Sharing from 'expo-sharing';
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
 * Sends the run out. Prefers the captured image; falls back to text when the
 * capture failed or image sharing is unavailable. Never throws.
 */
export async function shareRun(
  snapshot: RunSnapshot,
  uri: string | null,
): Promise<void> {
  const message = shareMessage(snapshot.score, snapshot.score >= snapshot.best);

  if (uri) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: message,
          UTI: 'public.png',
        });
        return;
      }
    } catch {
      // fall through to the text share
    }
  }

  try {
    await Share.share({ message });
  } catch {
    // user dismissed the sheet, or sharing is unavailable (e.g. web)
  }
}
