"use client";

import { useEffect, useRef } from "react";
import { useMotionStyle } from "@/components/motion/MotionProvider";

/**
 * The Valley, from above, with the house monogram turning over the middle of it.
 *
 * A stylised bird's-eye of the Phoenix metro rather than a map of it: the
 * Valley's defining feature is its mile grid on a flat basin ringed by
 * mountains, so that is what is built — a street grid, blocks that rise toward
 * a downtown core and flatten out into the suburbs, and the three ranges that
 * frame the city. Nothing here is fetched; the whole scene is generated from a
 * seeded pseudo-random sequence, so it is identical on every load and needs no
 * map tiles, no API key, and no network.
 *
 * The "GP" at the centre is drawn to a canvas in the site's own display face
 * (Sebastien Slab, the same @font-face the page uses) and mapped onto two
 * back-to-back planes, so it reads right way round from either side as it
 * turns. Drawing it rather than extruding a 3D font keeps the real typeface —
 * a converted mesh font would be an approximation of it.
 *
 * Colours are read from the active theme's CSS variables, so the scene follows
 * whatever palette the site is wearing.
 *
 * Everything obeys the site-wide motion setting: the camera drift and the
 * monogram's turn slow with it and stop dead when motion is off, where the
 * scene renders a single frame and the loop never starts. The canvas is
 * pointer-transparent — this is scenery, not a map to be dragged — and the
 * loop is suspended whenever the section is off screen.
 */

/** Anchors for the points of interest, in world units on the map plane. */
export const POI_ANCHORS: [number, number, number][] = [
  [-22, 2, -13],
  [23, 2, -4],
  [-5, 2, 19],
];

type Props = {
  /** Overlay content (the POI dots) — positioned onto the scene each frame. */
  children?: React.ReactNode;
  className?: string;
};

/** Deterministic PRNG, so the city is the same city on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `--c-gold: 230 179 103` → 0xe6b367, falling back when the var is missing. */
function themeColor(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return (parts[0] << 16) | (parts[1] << 8) | parts[2];
}

export default function PhoenixScene({ children, className = "" }: Props) {
  const motion = useMotionStyle();
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // three is ~150KB gzipped: loaded here, on the client, only once this
    // section is actually rendering a scene — never for edit mode, motion off,
    // or a visitor who never reaches the homepage.
    import("three").then((THREE) => {
      if (disposed) return;

      const gold = themeColor("--c-gold", 0xe6b367);
      const navy = themeColor("--c-navy", 0x141924);
      const navySoft = themeColor("--c-navy-soft", 0x232a3d);

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch {
        // No WebGL (or it is blocked): the overlay dots stand on their own.
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(navy, 60, 150);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

      // ---- ground -------------------------------------------------------
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(220, 220),
        new THREE.MeshLambertMaterial({ color: navy }),
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      // ---- the mile grid ------------------------------------------------
      // The Valley's streets run true north-south and east-west on a one-mile
      // grid; drawn as lines rather than geometry, it is what makes the view
      // read as Phoenix rather than as any city.
      const gridPts: number[] = [];
      const SPAN = 78;
      for (let i = -13; i <= 13; i++) {
        const p = i * 6;
        gridPts.push(-SPAN, 0.02, p, SPAN, 0.02, p);
        gridPts.push(p, 0.02, -SPAN, p, 0.02, SPAN);
      }
      const gridGeo = new THREE.BufferGeometry();
      gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
      const gridMat = new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.16 });
      scene.add(new THREE.LineSegments(gridGeo, gridMat));

      // ---- the blocks ---------------------------------------------------
      // One instanced mesh for every building in the valley. Height falls off
      // with distance from the centre, so a downtown core stands up out of a
      // low, wide sprawl — which is the shape of the place.
      const rand = mulberry32(20260817);
      const dummy = new THREE.Object3D();
      const boxes: { x: number; z: number; w: number; d: number; h: number }[] = [];
      for (let gx = -12; gx <= 12; gx++) {
        for (let gz = -12; gz <= 12; gz++) {
          const cx = gx * 6;
          const cz = gz * 6;
          const dist = Math.hypot(cx, cz);
          if (dist > 74) continue;
          // Thin the sprawl out toward the edges, and keep the very centre
          // clear for the monogram.
          const density = dist < 9 ? 0 : Math.max(0.12, 1 - dist / 80);
          const perBlock = dist < 26 ? 3 : 2;
          for (let n = 0; n < perBlock; n++) {
            if (rand() > density) continue;
            const w = 0.9 + rand() * 1.7;
            const d = 0.9 + rand() * 1.7;
            const core = Math.max(0, 1 - dist / 30);
            const h = 0.5 + rand() * (0.9 + core * core * 11);
            boxes.push({
              x: cx + (rand() - 0.5) * 4.2,
              z: cz + (rand() - 0.5) * 4.2,
              w,
              d,
              h,
            });
          }
        }
      }
      const blockGeo = new THREE.BoxGeometry(1, 1, 1);
      // Lifted off the ground colour so the metro reads as built-up rather
      // than as a dark patch on a dark plane.
      const blockBase = new THREE.Color(navySoft).lerp(new THREE.Color(0xffffff), 0.22);
      const blockMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const blocks = new THREE.InstancedMesh(blockGeo, blockMat, boxes.length);
      const tint = new THREE.Color();
      const goldColor = new THREE.Color(gold);
      const baseColor = blockBase;
      boxes.forEach((b, i) => {
        dummy.position.set(b.x, b.h / 2, b.z);
        dummy.scale.set(b.w, b.h, b.d);
        dummy.updateMatrix();
        blocks.setMatrixAt(i, dummy.matrix);
        // The taller a tower, the warmer it reads — the core catches the light.
        tint.copy(baseColor).lerp(goldColor, Math.min(0.7, (b.h / 12) * 0.95));
        blocks.setColorAt(i, tint);
      });
      blocks.instanceMatrix.needsUpdate = true;
      if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
      scene.add(blocks);

      // ---- the ranges that frame the valley ------------------------------
      // South Mountain along the south, Camelback near the middle east, and the
      // McDowells off the north-east — the three that actually place you.
      // Kept darker than the blocks: the ranges should read as the silhouette
      // the valley sits in, not as more city.
      const ridgeMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(navySoft).lerp(new THREE.Color(navy), 0.45),
        flatShading: true,
      });
      const ridges: import("three").Mesh[] = [];
      const addRidge = (x: number, z: number, w: number, h: number, d: number, rot: number) => {
        const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5, 1), ridgeMat);
        m.position.set(x, h / 2, z);
        m.scale.set(w, h, d);
        m.rotation.y = rot;
        scene.add(m);
        ridges.push(m);
      };
      addRidge(-6, 46, 34, 9, 9, 0.1); // South Mountain
      addRidge(27, -12, 9, 7, 5, -0.5); // Camelback, out past the core
      addRidge(40, -40, 16, 11, 10, 0.7); // McDowells
      addRidge(-52, -18, 14, 8, 9, -0.3); // White Tanks, far west

      // ---- the monogram ---------------------------------------------------
      const label = document.createElement("canvas");
      label.width = 1024;
      label.height = 512;
      const ctx = label.getContext("2d");
      const paintLabel = () => {
        if (!ctx) return;
        const display =
          getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() ||
          "serif";
        ctx.clearRect(0, 0, label.width, label.height);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `380px ${display}, serif`;
        ctx.fillText("GP", label.width / 2, label.height / 2 + 16);
        texture.needsUpdate = true;
      };
      const texture = new THREE.CanvasTexture(label);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      paintLabel();
      // The display face arrives from the CDN after first paint; redraw once it
      // has, or the monogram is a fallback serif forever.
      document.fonts
        ?.ready.then(() => {
          if (!disposed) paintLabel();
        })
        .catch(() => {});

      const monoMat = new THREE.MeshBasicMaterial({
        map: texture,
        color: gold,
        transparent: true,
        depthWrite: false,
      });
      const mono = new THREE.Group();
      const planeGeo = new THREE.PlaneGeometry(44, 22);
      const front = new THREE.Mesh(planeGeo, monoMat);
      front.position.z = 0.12;
      const back = new THREE.Mesh(planeGeo, monoMat);
      back.position.z = -0.12;
      back.rotation.y = Math.PI; // faces the other way, so it is never mirrored
      mono.add(front, back);
      mono.position.set(0, 13, 0);
      scene.add(mono);

      // ---- light ----------------------------------------------------------
      scene.add(new THREE.HemisphereLight(0xffffff, navy, 1.5));
      const key = new THREE.DirectionalLight(gold, 2.2);
      key.position.set(-30, 45, 18);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x9fb4dd, 0.7);
      fill.position.set(25, 20, -30);
      scene.add(fill);

      // ---- the POI anchors, projected onto the overlay ---------------------
      const anchors = POI_ANCHORS.map((a) => new THREE.Vector3(...a));
      const projected = new THREE.Vector3();

      const placeDots = (w: number, h: number) => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const dots = overlay.querySelectorAll<HTMLElement>("[data-poi]");
        // Keep pins off the panel's edges — and well clear of the bottom on a
        // phone, where the floating nav sits over that corner.
        const padX = 18;
        const padTop = 14;
        const padBottom = w < 640 ? 56 : 20;
        dots.forEach((dot, i) => {
          const anchor = anchors[i];
          if (!anchor) return;
          projected.copy(anchor).project(camera);
          const behind = projected.z >= 1;
          const x = Math.min(Math.max((projected.x * 0.5 + 0.5) * w, padX), w - padX);
          const y = Math.min(Math.max((-projected.y * 0.5 + 0.5) * h, padTop), h - padBottom);
          dot.style.left = `${x}px`;
          dot.style.top = `${y}px`;
          // A label running off the right edge is unreadable; past the
          // two-thirds mark the pin wears it on the other side instead.
          dot.dataset.flip = x > w * 0.62 ? "1" : "0";
          // Behind the camera there is nothing to point at; fold it away
          // rather than leaving a marker stranded.
          dot.style.opacity = behind ? "0" : "1";
          dot.style.pointerEvents = behind ? "none" : "auto";
        });
      };

      // ---- size, loop ------------------------------------------------------
      let w = 1;
      let h = 1;
      const resize = () => {
        const r = host.getBoundingClientRect();
        w = Math.max(1, r.width);
        h = Math.max(1, r.height);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // A narrow phone panel sees far less of the valley than a wide one;
        // pull the camera back so the city fills either shape.
        // Framed by the panel's shape, so the grid fills it rather than
        // sitting under empty sky: a tall phone panel looks steeply down from
        // high up, a normal desktop panel sits lower and further back, and the
        // wide letterbox a short desktop leaves comes in closer still.
        const aspect = w / h;
        if (aspect < 1) camera.position.set(0, 84, 60);
        else if (aspect < 2.4) camera.position.set(-14, 66, 52);
        else camera.position.set(-6, 46, 33);
        camera.lookAt(0, 2, 0);
        camera.updateProjectionMatrix();
      };

      const ro = new ResizeObserver(() => {
        resize();
        render(0);
      });
      ro.observe(host);

      const SPIN = { classic: 0.32, kinetic: 0.55, minimal: 0.16, off: 0 } as const;
      const spin = SPIN[motion];
      let t0: number | null = null;

      const render = (elapsed: number) => {
        mono.rotation.y = elapsed * spin;
        if (spin) {
          // A slow orbit over the valley, on the same setting as the monogram:
          // enough that the city has depth, not so much that it drifts away
          // from the view the section was composed around.
          const r = Math.hypot(camera.position.x, camera.position.z);
          const a = Math.atan2(camera.position.z, camera.position.x);
          const orbit = a + Math.sin(elapsed * 0.08) * 0.0025;
          camera.position.x = Math.cos(orbit) * r;
          camera.position.z = Math.sin(orbit) * r;
          camera.lookAt(0, 4, 0);
        }
        placeDots(w, h);
        renderer.render(scene, camera);
      };

      let raf = 0;
      const tick = (now: number) => {
        if (t0 == null) t0 = now;
        render((now - t0) / 1000);
        raf = requestAnimationFrame(tick);
      };

      resize();
      render(0);

      // Only run while the section is on screen — an idle 3D scene below the
      // fold is the most expensive thing a page can forget about.
      let running = false;
      const start = () => {
        if (running || !spin) return;
        running = true;
        raf = requestAnimationFrame(tick);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };
      const io = new IntersectionObserver(
        ([e]) => (e.isIntersecting ? start() : stop()),
        { rootMargin: "10% 0px" },
      );
      io.observe(host);
      const onVisibility = () => (document.hidden ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);

      cleanup = () => {
        stop();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        blockGeo.dispose();
        blockMat.dispose();
        planeGeo.dispose();
        monoMat.dispose();
        texture.dispose();
        gridGeo.dispose();
        gridMat.dispose();
        ridgeMat.dispose();
        ridges.forEach((m) => m.geometry.dispose());
        ground.geometry.dispose();
        (ground.material as import("three").Material).dispose();
        blocks.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [motion]);

  return (
    <div ref={hostRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* The dots live in the DOM as real buttons — the scene only moves them. */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {children}
      </div>
    </div>
  );
}
