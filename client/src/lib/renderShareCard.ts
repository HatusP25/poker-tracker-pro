import type { Scene } from './shareCard';

/**
 * Turn a scene into a PNG and hand it to the OS share sheet (or a download).
 *
 * Kept apart from `shareCard.ts` so the layout maths stays pure and testable —
 * this half is the untestable browser plumbing.
 */

/** 2x so the image stays crisp when a chat client scales it up. */
const SCALE = 2;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, ' +
  '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';

function drawScene(scene: Scene, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, scene.width, scene.height);

  for (const item of scene.items) {
    if (item.kind === 'rect') {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      // roundRect is widely supported; fall back to a plain rect where it isn't.
      if (item.radius && typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(item.x, item.y, item.w, item.h, item.radius);
        ctx.fill();
      } else {
        ctx.fillRect(item.x, item.y, item.w, item.h);
      }
      continue;
    }

    if (item.kind === 'line') {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y);
      ctx.lineTo(item.x + item.w, item.y);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = item.color;
    ctx.font = `${item.weight === 'bold' ? '700' : '400'} ${item.size}px ${FONT_STACK}`;
    ctx.textAlign = item.align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(item.text, item.x, item.y);
  }

  ctx.restore();
}

export async function renderSceneToBlob(scene: Scene): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = scene.width * SCALE;
  canvas.height = scene.height * SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context');

  drawScene(scene, ctx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image'))),
      'image/png'
    );
  });
}

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Share the card via the OS share sheet where that exists (every phone, which is
 * where forwarding actually happens), otherwise download it.
 *
 * Returns how it was delivered so the caller can word its toast honestly.
 */
export async function shareScene(
  scene: Scene,
  filename: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderSceneToBlob(scene);
  const file = new File([blob], filename, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (error) {
      // The user dismissing the sheet is not a failure — don't fall through to a
      // download they didn't ask for.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (permission, unsupported payload) still deserves the file.
    }
  }

  download(blob, filename);
  return 'downloaded';
}
