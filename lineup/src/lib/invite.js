// Invite someone to NYC Lines via the OS share sheet, falling back to copying
// the link if Web Share isn't available (e.g. desktop browsers).

// Where invites point. Swap to the App Store URL once the app is live.
export const INVITE_URL = 'https://8x9pknfpwq-prog.github.io/Nutrition-App/';
const INVITE_TEXT = 'Come see live bar wait times in NYC with me on NYC Lines:';

// Returns 'shared' | 'copied'. Throws only on unexpected failures (a user
// cancelling the share sheet is treated as a no-op, not an error).
export async function shareInvite() {
  const payload = { title: 'NYC Lines', text: INVITE_TEXT, url: INVITE_URL };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'shared'; // user closed the sheet
      // fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(`${INVITE_TEXT} ${INVITE_URL}`);
    return 'copied';
  } catch {
    throw new Error('Could not open the share sheet.');
  }
}
