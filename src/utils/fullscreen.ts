/**
 * Fullscreen API cross-browser helpers
 */

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenEnabled ||
      // @ts-expect-error vendor prefixes
      document.webkitFullscreenEnabled ||
      // @ts-expect-error vendor prefixes
      document.mozFullScreenEnabled ||
      // @ts-expect-error vendor prefixes
      document.msFullscreenEnabled
  );
}

export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
      // @ts-expect-error vendor prefixes
      document.webkitFullscreenElement ||
      // @ts-expect-error vendor prefixes
      document.mozFullScreenElement ||
      // @ts-expect-error vendor prefixes
      document.msFullscreenElement
  );
}

export async function enterFullscreen(): Promise<boolean> {
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };

  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
      return true;
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
      return true;
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
      return true;
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.error('Failed to enter fullscreen mode:', err);
    return false;
  }
  return false;
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch (err) {
    console.error('Failed to exit fullscreen mode:', err);
  }
}
