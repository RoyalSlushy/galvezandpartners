/**
 * Cross-browser "pick a color from the screen" helper.
 *
 * Chromium ships the native `EyeDropper` API and we use it when present (best
 * UX — no permission prompt). Everywhere else (Firefox, Safari, …) we fall back
 * to a screen capture via `getDisplayMedia`: we grab one frame, paint it into a
 * full-screen overlay with a zoom loupe, and let the admin click the pixel they
 * want. Resolves to a `#rrggbb` string, or `null` if the pick is cancelled.
 *
 * `isSupported()` reports whether either path is usable so callers can decide
 * whether to offer the tool at all.
 */

type NativeEyeDropper = { open: () => Promise<{ sRGBHex: string }> };

function nativeCtor(): (new () => NativeEyeDropper) | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { EyeDropper?: new () => NativeEyeDropper }).EyeDropper;
}

export function isSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(nativeCtor() || navigator.mediaDevices?.getDisplayMedia);
}

export async function pickScreenColor(): Promise<string | null> {
  const Ctor = nativeCtor();
  if (Ctor) {
    try {
      const { sRGBHex } = await new Ctor().open();
      return sRGBHex;
    } catch {
      return null; // dismissed
    }
  }
  return captureAndPick();
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0");
const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

async function captureAndPick(): Promise<string | null> {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!media?.getDisplayMedia) return null;

  let stream: MediaStream;
  try {
    stream = await media.getDisplayMedia({ video: true, audio: false });
  } catch {
    return null; // denied / cancelled the share prompt
  }

  // Grab a single painted frame, then release the capture immediately.
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch {
    /* autoplay may reject; metadata is enough to draw a frame */
  }
  await new Promise<void>((res) => {
    if (video.videoWidth) return res();
    video.addEventListener("loadedmetadata", () => res(), { once: true });
  });
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const frame = document.createElement("canvas");
  frame.width = vw;
  frame.height = vh;
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  if (!fctx || !vw || !vh) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  fctx.drawImage(video, 0, 0, vw, vh);
  stream.getTracks().forEach((t) => t.stop());
  video.srcObject = null;

  return new Promise<string | null>((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Pick a color from the captured screen");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:#0b0f16;" +
      "display:flex;align-items:center;justify-content:center;overscroll-behavior:contain;";

    // Display the frame at a "contain" fit so aspect ratio is preserved.
    const scale = Math.min(window.innerWidth / vw, window.innerHeight / vh);
    const dw = Math.max(1, Math.round(vw * scale));
    const dh = Math.max(1, Math.round(vh * scale));
    const disp = document.createElement("canvas");
    disp.width = dw;
    disp.height = dh;
    disp.style.cssText = "display:block;";
    const dctx = disp.getContext("2d");
    dctx?.drawImage(frame, 0, 0, dw, dh);
    overlay.appendChild(disp);

    const LOUPE = 132;
    const ZOOM = 9;
    const loupe = document.createElement("canvas");
    loupe.width = LOUPE;
    loupe.height = LOUPE;
    loupe.style.cssText =
      `position:fixed;width:${LOUPE}px;height:${LOUPE}px;border-radius:9999px;` +
      "border:2px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,.55);pointer-events:none;" +
      "transform:translate(-50%,-50%);display:none;z-index:1;image-rendering:pixelated;";
    const lctx = loupe.getContext("2d");
    if (lctx) lctx.imageSmoothingEnabled = false;
    overlay.appendChild(loupe);

    const readout = document.createElement("div");
    readout.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;pointer-events:none;" +
      "display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:9999px;" +
      "background:rgba(20,25,36,.92);border:1px solid rgba(255,255,255,.15);color:#fff;" +
      "font:600 13px system-ui,-apple-system,sans-serif;";
    const swatch = document.createElement("span");
    swatch.style.cssText =
      "width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:#000;";
    const label = document.createElement("span");
    label.textContent = "Click to pick · Esc to cancel";
    readout.append(swatch, label);
    overlay.appendChild(readout);

    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const sampleAt = (clientX: number, clientY: number): [number, number, number] | null => {
      const rect = disp.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const fx = Math.min(vw - 1, Math.floor((x / rect.width) * vw));
      const fy = Math.min(vh - 1, Math.floor((y / rect.height) * vh));
      const d = fctx.getImageData(fx, fy, 1, 1).data;
      return [d[0], d[1], d[2]];
    };

    const onMove = (e: PointerEvent) => {
      const rect = disp.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside || !lctx) {
        loupe.style.display = "none";
        return;
      }
      loupe.style.display = "block";
      loupe.style.left = `${e.clientX}px`;
      loupe.style.top = `${e.clientY}px`;
      const fx = ((e.clientX - rect.left) / rect.width) * vw;
      const fy = ((e.clientY - rect.top) / rect.height) * vh;
      const src = LOUPE / ZOOM;
      lctx.clearRect(0, 0, LOUPE, LOUPE);
      lctx.drawImage(frame, fx - src / 2, fy - src / 2, src, src, 0, 0, LOUPE, LOUPE);
      lctx.strokeStyle = "rgba(255,255,255,.9)";
      lctx.lineWidth = 1;
      lctx.strokeRect(LOUPE / 2 - ZOOM / 2, LOUPE / 2 - ZOOM / 2, ZOOM, ZOOM);
      const rgb = sampleAt(e.clientX, e.clientY);
      if (rgb) swatch.style.background = toHex(rgb[0], rgb[1], rgb[2]);
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("keydown", onKey, true);
      overlay.remove();
      document.body.style.overflow = prevOverflow;
    };
    const finish = (val: string | null) => {
      cleanup();
      resolve(val);
    };
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      const rgb = sampleAt(e.clientX, e.clientY);
      finish(rgb ? toHex(rgb[0], rgb[1], rgb[2]) : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(null);
      }
    };

    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", onClick);
    overlay.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      finish(null);
    });
  });
}
