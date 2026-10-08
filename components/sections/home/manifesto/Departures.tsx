"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale, useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionStyle, type MotionStyle } from "@/components/motion/MotionProvider";
import {
  ManifestoColumns,
  ManifestoMedia,
  ManifestoShell,
  TitleLines,
  VisualPlaceholder,
  canAnimate,
  graphemes,
  splitWords,
  useArrival,
  useIsoLayoutEffect,
  wordIndex,
  type ManifestoProps,
} from "./shared";

/** What the flaps run through on the way to their letter. */
const FLAP_CHARS = graphemes("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789&+");
/** The smallest a tile gets before the board wraps its lines shorter (px). */
const MIN_TILE = { phone: 20, wide: 32 };
/** How long the board holds the other language before turning over (ms). */
const HOLD_MS = 1500;

type Cell = { ch: string; gold: boolean };

/**
 * Departures — the manifesto as a split-flap board.
 *
 * The title is set on a board of flap tiles, one letter each. When the section
 * arrives the board clatters to life: every tile flips through a run of
 * letters before landing on its own, the wave sweeping down and across the
 * board, and it lands first on the title in the *other* language — Spanish on
 * the English site, English on the Spanish one — holds it, and turns over to
 * this one. A multi-cultural agency, announced in both of its languages. The
 * visual turns over like a card from its back as the board starts, and the
 * intro rises once the board has settled.
 *
 * The board is sized to the copy column: as many columns as the longest word
 * in either language needs (lines wrap between words), and tiles as large as
 * the column then allows. The real title stays in the page for screen readers
 * — the board is a picture of it — and is what shows before the board can be
 * measured (and without JS). A language switch later flips the board straight
 * over to the new language. With motion off the board simply shows the title;
 * minimal fades it in with no flapping; kinetic flaps faster and longer.
 */
export default function Departures({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const { locale, tIn } = useLocale();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [phone, setPhone] = useState(false);
  const [armed, setArmed] = useState(false);

  const lines = multicultural.titleLines;
  const active = useMemo(() => lines.map((l) => tv(l)), [lines, tv]);
  // The board's other language: the Spanish on the English site, the English
  // source on the Spanish one.
  const other = useMemo(
    () => lines.map((l) => (locale === "en" ? tIn("es", l) : l)),
    [lines, locale, tIn],
  );

  // The column's width decides the board.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(Math.floor(el.clientWidth));
      setPhone(window.innerWidth < 751);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const board = useMemo(
    () => (width > 0 ? layoutBoard(active, other, width, phone) : null),
    [active, other, width, phone],
  );
  const latest = useRef(board);
  latest.current = board;

  // The flap controller for the board as rendered; rebuilt whenever the board
  // is (a resize that changes its shape), and painted with whatever the board
  // should be showing at that point.
  const flapRef = useRef<Flapper | null>(null);
  const stage = useRef<"blank" | "running" | "settled">("settled");
  const runRef = useRef(0);
  const boardKey = board ? `${board.rows}x${board.cols}` : "";

  useEffect(() => {
    const el = boardRef.current;
    if (!el || !board) return;
    const flapper = new Flapper(el, board.cols);
    flapRef.current = flapper;
    if (stage.current === "running") {
      // Mid-entrance when the board was rebuilt: drop the run and land the
      // board where it was going.
      runRef.current++;
      stage.current = "settled";
      sectionRef.current?.setAttribute("data-df-intro", "");
    }
    flapper.show(stage.current === "blank" ? blankGrid(board) : board.active);
    return () => {
      flapper.cancel();
      if (flapRef.current === flapper) flapRef.current = null;
    };
    // Only the board's shape rebuilds it; new text is flipped to (below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  // New text on a settled board (a language switch, an edit): flip to it.
  const activeKey = board ? board.active.map((c) => c.ch + (c.gold ? "*" : "")).join("") : "";
  useEffect(() => {
    if (!board || stage.current !== "settled") return;
    const flapper = flapRef.current;
    if (!flapper) return;
    if (canAnimate(motion) && motion !== "minimal") void flapper.flipTo(board.active, tuning(motion, true));
    else flapper.show(board.active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Arm the entrance: the board goes blank, the card turns its back, the intro
  // waits.
  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !canAnimate(motion)) return;
    section.setAttribute("data-df", "wait");
    section.removeAttribute("data-df-intro");
    stage.current = "blank";
    if (board) flapRef.current?.show(blankGrid(board));
    setArmed(true);
    return () => {
      runRef.current++;
      flapRef.current?.cancel();
      section.removeAttribute("data-df");
      section.removeAttribute("data-df-intro");
      stage.current = "settled";
      const b = latest.current;
      if (b) flapRef.current?.show(b.active);
      setArmed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

  useArrival(sectionRef, {
    enabled: armed && !!board,
    onArrive: () => {
      const section = sectionRef.current;
      const b = latest.current;
      const flapper = flapRef.current;
      if (!section || !b || !flapper) return;
      const run = ++runRef.current;
      stage.current = "running";
      section.setAttribute("data-df", "in");
      void (async () => {
        if (motion === "minimal") {
          flapper.show(b.active);
        } else {
          const bilingual = b.other.some((c, i) => c.ch !== b.active[i].ch);
          await wait(160);
          if (bilingual && run === runRef.current) {
            await flapper.flipTo(b.other, tuning(motion, false));
            await wait(HOLD_MS);
          }
          if (run !== runRef.current) return;
          await flapper.flipTo(b.active, tuning(motion, bilingual));
        }
        if (run !== runRef.current) return;
        stage.current = "settled";
        section.setAttribute("data-df-intro", "");
      })();
    },
    onLeave: () => {
      const section = sectionRef.current;
      const b = latest.current;
      runRef.current++;
      flapRef.current?.cancel();
      stage.current = "blank";
      if (b) flapRef.current?.show(blankGrid(b));
      section?.setAttribute("data-df", "wait");
      section?.removeAttribute("data-df-intro");
    },
  });

  const tile = board ? tileMetrics(board, width) : null;

  return (
    <ManifestoShell sectionRef={sectionRef}>
      <ManifestoColumns
        copy={
          <>
            <div ref={wrapRef} className="w-full">
              {board && tile ? (
                <>
                  <h2 className="sr-only">{active.join(" ")}</h2>
                  <div
                    ref={boardRef}
                    key={boardKey}
                    aria-hidden
                    className="df-board"
                    style={
                      {
                        "--tw": `${tile.w}px`,
                        "--th": `${tile.h}px`,
                        "--tf": `${tile.font}px`,
                        "--gap": `${tile.gap}px`,
                      } as CSSProperties
                    }
                  >
                    {Array.from({ length: board.rows }, (_, r) => (
                      <div key={r} className="df-row">
                        {Array.from({ length: board.cols }, (_, c) => (
                          <span key={c} className="df-tile">
                            <span className="df-half df-top">
                              <span className="df-ch" />
                            </span>
                            <span className="df-half df-bot">
                              <span className="df-ch" />
                            </span>
                            <span className="df-half df-top df-flap">
                              <span className="df-ch" />
                            </span>
                            <span className="df-half df-bot df-flap">
                              <span className="df-ch" />
                            </span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                // Until the board is measured. Hidden while an entrance is
                // armed, so it never shows only to be swapped for the board.
                <TitleLines lines={lines} t={tv} className="df-fallback" />
              )}
            </div>
            <p className="df-intro mt-5 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:mt-6 sm:text-f8">
              {splitWords(tv(multicultural.intro), wordIndex)}
            </p>
          </>
        }
        visual={
          // A card that turns over from its back: the frame holds the
          // perspective, the card turns, and each face clips its own content
          // (clipping the frame would flatten the turn).
          <div className="df-frame relative order-first aspect-[4/3] w-full sm:order-none">
            <div className="df-card absolute inset-0">
              <div className="df-face absolute inset-0 overflow-hidden">
                {multicultural.image ? (
                  <ManifestoMedia
                    raw={multicultural.image}
                    alt={t("Galvez & Partners")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <VisualPlaceholder />
                )}
              </div>
              <div aria-hidden className="df-face df-back absolute inset-0">
                <span className="font-display text-f4 leading-none text-gold/50">G+P</span>
              </div>
            </div>
          </div>
        }
      />
    </ManifestoShell>
  );
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Flap timing for a style: how many letters a tile runs through and how fast,
 * and how the wave travels across the board. A second pass (turning over from
 * the other language) runs a shorter way. */
function tuning(motion: MotionStyle, second: boolean) {
  const kinetic = motion === "kinetic";
  return {
    minSteps: second ? 2 : kinetic ? 4 : 3,
    maxSteps: second ? (kinetic ? 6 : 4) : kinetic ? 10 : 7,
    stepMs: kinetic ? 70 : 92,
    rowLag: kinetic ? 70 : 90,
    colLag: kinetic ? 26 : 34,
    jitter: 90,
  };
}

type Board = { rows: number; cols: number; active: Cell[]; other: Cell[] };

/**
 * Lay both languages out on one board: wrap every line to the column count
 * (between words; a word longer than the board is broken), mark the rows that
 * came from the payoff line, and size the board to the taller of the two.
 */
function layoutBoard(active: string[], other: string[], width: number, phone: boolean): Board {
  const words = [...active, ...other]
    .flatMap((l) => l.toLocaleUpperCase().split(/\s+/))
    .filter(Boolean);
  const longest = Math.max(1, ...words.map((w) => graphemes(w).length));
  const gap = gapFor(width);
  const fit = Math.max(6, Math.floor((width + gap) / ((phone ? MIN_TILE.phone : MIN_TILE.wide) + gap)));
  const cols = Math.min(fit, Math.max(10, longest));

  const rowsOf = (lines: string[]) =>
    lines.flatMap((line, i) =>
      wrap(line.toLocaleUpperCase(), cols).map((text) => ({ text, gold: i === lines.length - 1 })),
    );
  const a = rowsOf(active);
  const b = rowsOf(other);
  const rows = Math.max(a.length, b.length);
  const grid = (rs: { text: string[]; gold: boolean }[]) => {
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push({ ch: rs[r]?.text[c] ?? " ", gold: !!rs[r]?.gold });
    }
    return cells;
  };
  return { rows, cols, active: grid(a), other: grid(b) };
}

/** Greedy word wrap into rows of at most `cols` letters each. */
function wrap(text: string, cols: number): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  for (let word of text.split(/\s+/).filter(Boolean).map((w) => graphemes(w))) {
    while (word.length > cols) {
      if (row.length) rows.push(row);
      rows.push(word.slice(0, cols));
      word = word.slice(cols);
      row = [];
    }
    if (!row.length) row = word;
    else if (row.length + 1 + word.length <= cols) row = [...row, " ", ...word];
    else {
      rows.push(row);
      row = word;
    }
  }
  if (row.length) rows.push(row);
  return rows.length ? rows : [[]];
}

const gapFor = (width: number) => Math.max(2, Math.min(5, Math.round(width * 0.006)));

/** Tile and letter sizes for the board at this width. The display face is
 * wide and short (capitals about 0.56em across and 0.45em tall, a W nearly a
 * full em), so the letter is set a little larger than the tile is wide — a
 * typical capital then fills about three fifths of its tile — and the tile is
 * kept squarish, so the letter fills its height too. */
function tileMetrics(board: Board, width: number) {
  const gap = gapFor(width);
  const w = Math.floor((width - (board.cols - 1) * gap) / board.cols);
  return { w, h: Math.round(w * 1.2), font: Math.round(w * 1.12), gap };
}

const blankGrid = (board: Board): Cell[] =>
  board.active.map(() => ({ ch: " ", gold: false }));

/**
 * Drives the board's tiles. Each tile is four half-tiles: the top and bottom
 * halves at rest, and a top and bottom flap. Going from one letter to the next,
 * the top half underneath already shows the new letter while the top flap —
 * still the old one — falls forward to the middle; then the bottom flap,
 * carrying the new letter's lower half, falls from the middle down over the
 * old one. The letters are written straight into the DOM (React only renders
 * the empty tiles), so nothing here ever re-renders.
 */
class Flapper {
  private cells: { faces: HTMLElement[]; ch: string; gold: boolean }[];
  private cols: number;
  private run = 0;
  private live = new Set<Animation>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(board: HTMLElement, cols: number) {
    this.cols = Math.max(1, cols);
    this.cells = Array.from(board.querySelectorAll<HTMLElement>(".df-tile")).map((tile) => ({
      faces: Array.from(tile.children) as HTMLElement[],
      ch: " ",
      gold: false,
    }));
  }

  cancel() {
    this.run++;
    this.live.forEach((a) => a.cancel());
    this.live.clear();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    for (const cell of this.cells) {
      cell.faces[2].style.visibility = "";
      cell.faces[3].style.visibility = "";
    }
  }

  /** Paint every tile at once, no flapping. */
  show(grid: Cell[]) {
    this.cancel();
    this.cells.forEach((cell, i) => {
      const { ch, gold } = grid[i] ?? { ch: " ", gold: false };
      for (const face of cell.faces) paint(face, ch, gold);
      cell.ch = ch;
      cell.gold = gold;
    });
  }

  /** Flap every tile through to `grid`; resolves once the board has settled
   * (or the run was cancelled). */
  async flipTo(grid: Cell[], o: ReturnType<typeof tuning>) {
    this.cancel();
    const run = this.run;
    const cols = this.cols;
    await Promise.all(
      this.cells.map(async (cell, i) => {
        const target = grid[i] ?? { ch: " ", gold: false };
        if (cell.ch === target.ch && cell.gold === target.gold) return;
        const r = Math.floor(i / cols);
        const c = i % cols;
        await this.sleep(r * o.rowLag + c * o.colLag + Math.random() * o.jitter);
        const steps = o.minSteps + Math.floor(Math.random() * (o.maxSteps - o.minSteps + 1));
        for (let s = 1; s <= steps; s++) {
          if (run !== this.run) return;
          const next =
            s === steps ? target.ch : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
          await this.step(cell, next, target.gold, o.stepMs);
        }
      }),
    );
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        this.timers.delete(id);
        resolve();
      }, ms);
      this.timers.add(id);
    });
  }

  private async flap(el: HTMLElement, frames: Keyframe[], ms: number, easing: string) {
    const a = el.animate(frames, { duration: ms, easing });
    this.live.add(a);
    try {
      await a.finished;
    } catch {
      /* cancelled */
    } finally {
      this.live.delete(a);
    }
  }

  private async step(cell: { faces: HTMLElement[]; ch: string; gold: boolean }, next: string, gold: boolean, ms: number) {
    const [top, bottom, topFlap, bottomFlap] = cell.faces;
    const run = this.run;
    paint(top, next, gold);
    paint(topFlap, cell.ch, cell.gold);
    topFlap.style.visibility = "visible";
    await this.flap(
      topFlap,
      [
        { transform: "rotateX(0deg)", filter: "brightness(1)" },
        { transform: "rotateX(-90deg)", filter: "brightness(0.55)" },
      ],
      ms / 2,
      "ease-in",
    );
    topFlap.style.visibility = "";
    if (run !== this.run) return;
    paint(bottomFlap, next, gold);
    bottomFlap.style.visibility = "visible";
    await this.flap(
      bottomFlap,
      [
        { transform: "rotateX(90deg)", filter: "brightness(1.35)" },
        { transform: "rotateX(0deg)", filter: "brightness(1)" },
      ],
      ms / 2,
      "ease-out",
    );
    paint(bottom, next, gold);
    bottomFlap.style.visibility = "";
    cell.ch = next;
    cell.gold = gold;
  }
}

function paint(face: HTMLElement, ch: string, gold: boolean) {
  const glyph = face.firstElementChild as HTMLElement | null;
  if (glyph && glyph.textContent !== ch) glyph.textContent = ch;
  face.classList.toggle("df-gold", gold);
}
