/**
 * "Pick a color" helper for the gradient editor.
 *
 * The native `EyeDropper` API only exists on desktop Chromium, and screen
 * capture (`getDisplayMedia`) is unavailable on mobile — so neither works on
 * Chrome for Android/iOS. This module provides a custom, fully cross-browser
 * eyedropper that samples straight from an image (the hero image) on a canvas:
 * it needs no permissions and works identically on desktop and touch devices.
 *
 * `pickScreenColor(imageSrc)` uses the native eyedropper when present (lets you
 * pick anywhere on screen) and otherwise falls back to the custom image
 * sampler. Both resolve to a `#rrggbb` string, or `null` if cancelled.
 */

type NativeEyeDropper = { open: () => Promise<{ sRGBHex: string }> };

function nativeCtor(): (new () => NativeEyeDropper) | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { EyeDropper?: new () => NativeEyeDropper }).EyeDropper;
}

/** Whether the browser's built-in "pick anywhere" eyedropper exists. */
export function hasNativeEyeDropper(): boolean {
  return Boolean(nativeCtor());
}

export async function pickScreenColor(imageSrc?: string): Promise<string | null> {
  const Ctor = nativeCtor();
  if (Ctor) {
    try {
      const { sRGBHex } = await new Ctor().open();
      return sRGBHex;
    } catch {
      return null; // dismissed
    }
  }
  if (imageSrc) return pickImageColor(imageSrc);
  return null;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    // If the CORS load fails, retry without it — the image still displays, and
    // sampling degrades gracefully (getImageData throws → "can't read" notice).
    img.onerror = () => {
      const bare = new Image();
      bare.onload = () => resolve(bare);
      bare.onerror = () => resolve(null);
      bare.src = src;
    };
    img.src = src;
  });
}

/**
 * Custom eyedropper: shows `src` full-screen and lets the user drag a loupe over
 * it (touch or mouse) to sample a pixel. Mouse users can also click to pick;
 * touch users confirm with the "Use color" button (so a fingertip never hides
 * the target). Resolves to the picked hex, or null on cancel.
 */
export async function pickImageColor(src: string): Promise<string | null> {
  const img = await loadImage(src);
  if (!img) return null;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;

  const frame = document.createElement("canvas");
  frame.width = iw;
  frame.height = ih;
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  if (!fctx) return null;
  fctx.drawImage(img, 0, 0);
  let readable = true;
  try {
    fctx.getImageData(0, 0, 1, 1);
  } catch {
    readable = false; // cross-origin taint — display only
  }

  return new Promise<string | null>((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Pick a color from the image");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#0b0f16;display:flex;" +
      "flex-direction:column;touch-action:none;overscroll-behavior:contain;";

    const stage = document.createElement("div");
    stage.style.cssText =
      "position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;";
    const disp = document.createElement("canvas");
    disp.style.cssText = "display:block;touch-action:none;cursor:crosshair;";
    stage.appendChild(disp);

    const cross = document.createElement("div");
    cross.style.cssText =
      "position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid #fff;" +
      "border-radius:9999px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 6px rgba(0,0,0,.5);pointer-events:none;display:none;";
    stage.appendChild(cross);

    const LOUPE = 120;
    const ZOOM = 9;
    const loupe = document.createElement("canvas");
    loupe.width = LOUPE;
    loupe.height = LOUPE;
    loupe.style.cssText =
      `position:absolute;width:${LOUPE}px;height:${LOUPE}px;border-radius:9999px;border:2px solid #fff;` +
      "box-shadow:0 6px 20px rgba(0,0,0,.55);pointer-events:none;transform:translate(-50%,-135%);" +
      "display:none;image-rendering:pixelated;";
    const lctx = loupe.getContext("2d");
    if (lctx) lctx.imageSmoothingEnabled = false;
    stage.appendChild(loupe);
    overlay.appendChild(stage);

    const bar = document.createElement("div");
    bar.style.cssText =
      "display:flex;align-items:center;gap:12px;padding:14px 16px;background:#141924;border-top:1px solid rgba(255,255,255,.1);";
    const swatch = document.createElement("span");
    swatch.style.cssText =
      "width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:#000;flex:none;";
    const hexLabel = document.createElement("span");
    hexLabel.style.cssText =
      "font:600 14px system-ui,-apple-system,sans-serif;color:#fff;flex:1;letter-spacing:.03em;";
    hexLabel.textContent = readable ? "Drag over the image to sample" : "Can’t read this image’s colors";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "padding:9px 14px;border-radius:9999px;border:none;background:transparent;color:rgba(255,255,255,.7);" +
      "font:600 13px system-ui;cursor:pointer;";
    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Use color";
    useBtn.style.cssText =
      "padding:9px 16px;border-radius:9999px;border:none;background:#e6b367;color:#141924;" +
      "font:700 13px system-ui;cursor:pointer;opacity:.5;";
    useBtn.disabled = true;
    bar.append(swatch, hexLabel, cancelBtn, useBtn);
    overlay.appendChild(bar);

    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const fit = () => {
      const sw = stage.clientWidth || window.innerWidth;
      const sh = stage.clientHeight || window.innerHeight;
      const scale = Math.min(sw / iw, sh / ih) || 1;
      disp.width = Math.max(1, Math.round(iw * scale));
      disp.height = Math.max(1, Math.round(ih * scale));
      disp.getContext("2d")?.drawImage(frame, 0, 0, disp.width, disp.height);
    };
    fit();

    let current: string | null = null;
    let lastType = "mouse";

    const sample = (clientX: number, clientY: number) => {
      if (!readable) return;
      const rect = disp.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
      const left = rect.left - stageRect.left + x;
      const top = rect.top - stageRect.top + y;

      cross.style.display = "block";
      cross.style.left = `${left}px`;
      cross.style.top = `${top}px`;

      const fx = (x / rect.width) * iw;
      const fy = (y / rect.height) * ih;
      if (lctx) {
        const srcSize = LOUPE / ZOOM;
        lctx.clearRect(0, 0, LOUPE, LOUPE);
        lctx.drawImage(frame, fx - srcSize / 2, fy - srcSize / 2, srcSize, srcSize, 0, 0, LOUPE, LOUPE);
        lctx.strokeStyle = "rgba(255,255,255,.9)";
        lctx.lineWidth = 1;
        lctx.strokeRect(LOUPE / 2 - ZOOM / 2, LOUPE / 2 - ZOOM / 2, ZOOM, ZOOM);
      }
      loupe.style.display = "block";
      loupe.style.left = `${left}px`;
      loupe.style.top = `${top}px`;

      const px = Math.min(iw - 1, Math.floor(fx));
      const py = Math.min(ih - 1, Math.floor(fy));
      const d = fctx.getImageData(px, py, 1, 1).data;
      current = toHex(d[0], d[1], d[2]);
      swatch.style.background = current;
      hexLabel.textContent = current.toUpperCase();
      useBtn.disabled = false;
      useBtn.style.opacity = "1";
    };

    let dragging = false;
    const onDown = (e: PointerEvent) => {
      lastType = e.pointerType || "mouse";
      dragging = true;
      disp.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      sample(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging || e.pointerType === "mouse") {
        e.preventDefault();
        sample(e.clientX, e.clientY);
      }
    };
    const onUp = () => {
      dragging = false;
    };
    const onClick = () => {
      // Mouse: a click picks immediately. Touch confirms via the button so the
      // fingertip doesn't obscure the target pixel.
      if (lastType === "mouse" && current) finish(current);
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", fit);
      overlay.remove();
      document.body.style.overflow = prevOverflow;
    };
    const finish = (val: string | null) => {
      cleanup();
      resolve(val);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(null);
      }
    };

    disp.addEventListener("pointerdown", onDown);
    disp.addEventListener("pointermove", onMove);
    disp.addEventListener("pointerup", onUp);
    disp.addEventListener("pointercancel", onUp);
    disp.addEventListener("click", onClick);
    cancelBtn.addEventListener("click", () => finish(null));
    useBtn.addEventListener("click", () => finish(current));
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", fit);
  });
}
