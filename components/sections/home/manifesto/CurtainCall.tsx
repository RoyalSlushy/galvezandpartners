"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import { useMotionStyle } from "@/components/motion/MotionProvider";
import {
  ManifestoColumns,
  ManifestoShell,
  ManifestoVisual,
  TitleLines,
  canAnimate,
  splitWords,
  useArrival,
  useIsoLayoutEffect,
  wordIndex,
  type ManifestoProps,
} from "./shared";

/** When the visual's bar sets off, and the first line's after it (ms). */
const VISUAL_AT = 0;
const FIRST_LINE_AT = 180;
/** Between one line's bars and the next line's, and between the words of a
 * line — the bars cascade along it like type being set. */
const LINE_GAP = 170;
const WORD_GAP = 70;

/**
 * Curtain Call — the editorial block reveal.
 *
 * When the section arrives, a gold bar sweeps across each word of the title
 * from the left, holds for a beat over it, and draws off to the right, leaving
 * the word behind it; the bars cascade along each line and down the lines in
 * turn. A bar per word rather than per line, so a line that wraps (a phone,
 * the column on a desktop) is covered row by row and only ever breaks between
 * words, as the other styles' lines do. The visual is unveiled the
 * same way by a bar of its own (the picture settling back from a slight zoom
 * as the bar leaves), a fine gold rule draws itself under the payoff, and the
 * intro's words rise into place after.
 *
 * The section's [data-cc] attribute drives all of it in CSS (see "Manifesto:
 * Curtain Call" in globals.css): absent, everything is simply there — no JS,
 * or motion off; "wait", the copy is held hidden for the entrance; "in", it
 * plays. It goes back to "wait" once the section has left the screen, so the
 * curtain rises again on the next visit. Under the minimal motion style the
 * lines fade in, in the same order, with no bars; kinetic skids each line in
 * with a lean that springs upright.
 */
export default function CurtainCall({ multicultural }: ManifestoProps) {
  const t = useT();
  const tv = useEditableT();
  const motion = useMotionStyle();
  const sectionRef = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  // Hold the copy back for the entrance only while there is one to play.
  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !canAnimate(motion)) return;
    section.setAttribute("data-cc", "wait");
    setArmed(true);
    return () => {
      section.removeAttribute("data-cc");
      setArmed(false);
    };
  }, [motion]);

  useArrival(sectionRef, {
    enabled: armed,
    onArrive: () => sectionRef.current?.setAttribute("data-cc", "in"),
    onLeave: () => sectionRef.current?.setAttribute("data-cc", "wait"),
  });

  const lines = multicultural.titleLines;
  // Each line starts once the line above has had most of its bars go by.
  const lineStarts = lines.reduce<number[]>((acc, line, i) => {
    const prevWords = i > 0 ? wordCount(tv(lines[i - 1])) : 0;
    acc.push(i === 0 ? FIRST_LINE_AT : acc[i - 1] + LINE_GAP + (prevWords - 1) * WORD_GAP * 0.6);
    return acc;
  }, []);
  const lastLine = lines.length - 1;
  // The intro rises once the payoff is out from under its bars.
  const introAt =
    lineStarts[lastLine] + (wordCount(tv(lines[lastLine] ?? "")) - 1) * WORD_GAP + 760;

  const words = (text: string, line: number) => {
    let n = 0;
    return text.split(/(\s+)/).map((token, k) =>
      token.trim() === "" ? (
        token
      ) : (
        <span
          key={k}
          className="cc-word relative inline-block"
          style={delay(lineStarts[line] + n++ * WORD_GAP)}
        >
          <span className="cc-text inline-block">{token}</span>
          <span aria-hidden className="cc-bar" />
        </span>
      ),
    );
  };

  return (
    <ManifestoShell sectionRef={sectionRef}>
      <ManifestoColumns
        copy={
          <>
            <TitleLines
              lines={lines}
              t={tv}
              renderLine={(text, i, payoff) =>
                payoff ? (
                  // The rule under the payoff spans the whole line, drawn once
                  // its last bar has gone.
                  <span
                    className="relative inline-block"
                    style={delay(lineStarts[i] + (wordCount(text) - 1) * WORD_GAP)}
                  >
                    {words(text, i)}
                    <span aria-hidden className="cc-underline" />
                  </span>
                ) : (
                  words(text, i)
                )
              }
            />
            <p
              className="cc-intro mt-1 max-w-2xl whitespace-pre-line font-body text-f9 text-white/80 sm:text-f8"
              style={{ ["--d0" as string]: `${introAt}ms` } as CSSProperties}
            >
              {splitWords(tv(multicultural.intro), wordIndex)}
            </p>
          </>
        }
        visual={
          <ManifestoVisual
            image={multicultural.image}
            alt={t("Galvez & Partners")}
            className="cc-visual"
            mediaClassName="cc-media"
            style={delay(VISUAL_AT)}
          >
            <span aria-hidden className="cc-vbar" />
          </ManifestoVisual>
        }
      />
    </ManifestoShell>
  );
}

const delay = (ms: number) => ({ ["--d" as string]: `${Math.round(ms)}ms` }) as CSSProperties;

const wordCount = (text: string) => Math.max(1, text.split(/\s+/).filter(Boolean).length);
