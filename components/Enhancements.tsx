"use client";

import { useEffect } from "react";

/**
 * Client-side restoration of the interactivity the dead Wix runtime no longer
 * provides on the captured pages: the card carousel (swipe / arrows / dots),
 * the on-scroll reveal of the "next" section, and the mobile hamburger menu
 * plus an EN/ES language toggle. Each piece feature-detects its target, so this
 * is a no-op on pages that don't contain it. Renders nothing.
 */
export default function Enhancements() {
  useEffect(() => {
    const w = window as any;
    const doc = document as any;

    function safe(label: string, fn: () => void) {
      try {
        fn();
      } catch (e) {
        if (window.console) console.warn("[gp-enhance] " + label + " failed:", e);
      }
    }

    // ===== 1) CARD CAROUSEL — swipable, one card at a time, wrap-around =====
    function initCarousel() {
      const slideshow: any = document.getElementById("comp-lyrl5vkw");
      if (!slideshow || slideshow.__gpInit) return;
      const repeater: any = document.getElementById("comp-lyrl5vl5");
      if (!repeater) return;
      const host: any =
        repeater.querySelector('[data-testid="responsive-container-content"]') || repeater;
      const slides: any[] = Array.prototype.filter.call(
        host.children,
        (n: any) => n.nodeType === 1
      );
      if (slides.length < 2) return;
      slideshow.__gpInit = true;
      slideshow.classList.add("gp-carousel-ready");

      let current = 0;
      let animating = false;

      slides.forEach((s: any, i: number) => {
        s.classList.add("gp-slide");
        // Wix shows only the current slide and hides the rest via visibility:hidden
        // (inherited by descendants) plus per-slide opacity reveals that never ran.
        // Force every slide + content visible; show/hide is driven by slide opacity.
        s.style.setProperty("visibility", "visible", "important");
        Array.prototype.forEach.call(s.querySelectorAll("*"), (el: any) => {
          if (parseFloat(getComputedStyle(el).opacity) < 1)
            el.style.setProperty("opacity", "1", "important");
          if (getComputedStyle(el).visibility === "hidden")
            el.style.setProperty("visibility", "visible", "important");
        });
        if (i === 0) {
          s.classList.add("gp-active");
          s.style.opacity = "1";
          s.style.transform = "translateX(0)";
          s.style.pointerEvents = "auto";
          s.style.zIndex = "2";
        } else {
          s.style.opacity = "0";
          s.style.transform = "translateX(40px)";
          s.style.pointerEvents = "none";
          s.style.zIndex = "0";
        }
        s.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      });

      function go(target: number, dir?: number) {
        const n = slides.length;
        target = ((target % n) + n) % n;
        if (target === current || animating) return;
        if (typeof dir !== "number") dir = target > current ? 1 : -1;
        animating = true;
        const oldEl = slides[current];
        const newEl = slides[target];

        oldEl.style.transition = "opacity .45s ease, transform .45s ease";
        oldEl.style.transform = "translateX(" + (dir > 0 ? "-40px" : "40px") + ")";
        oldEl.style.opacity = "0";
        oldEl.style.pointerEvents = "none";
        oldEl.style.zIndex = "1";
        oldEl.classList.remove("gp-active");
        oldEl.setAttribute("aria-hidden", "true");

        newEl.classList.add("gp-active");
        newEl.style.transition = "none";
        newEl.style.transform = "translateX(" + (dir > 0 ? "40px" : "-40px") + ")";
        newEl.style.opacity = "0";
        newEl.style.pointerEvents = "none";
        newEl.style.zIndex = "2";
        void newEl.offsetWidth; // reflow
        newEl.style.transition = "opacity .45s ease, transform .45s ease";
        newEl.style.transform = "translateX(0)";
        newEl.style.opacity = "1";
        newEl.setAttribute("aria-hidden", "false");

        current = target;
        updateDots();
        window.setTimeout(() => {
          newEl.style.pointerEvents = "auto";
          oldEl.style.zIndex = "0";
          animating = false;
        }, 470);
      }
      const next = () => go(current + 1, 1);
      const prev = () => go(current - 1, -1);

      // Wire native Prev/Next controls (left = prev, right = next, by x-position).
      const ctrls: any[] = Array.prototype.slice.call(
        slideshow.querySelectorAll('[class*="SlideshowButton"]')
      );
      const roots = ctrls.filter(
        (el: any) => !ctrls.some((o: any) => o !== el && o.contains(el))
      );
      if (roots.length >= 2) {
        roots.sort(
          (a: any, b: any) => a.getBoundingClientRect().left - b.getBoundingClientRect().left
        );
        const prevBtn = roots[0];
        const nextBtn = roots[roots.length - 1];
        const bind = (el: any, fn: () => void) => {
          el.addEventListener(
            "click",
            (e: any) => {
              e.preventDefault();
              e.stopPropagation();
              fn();
            },
            true
          );
          const inner = el.querySelector("button");
          if (inner) {
            inner.disabled = false;
            inner.removeAttribute("disabled");
          }
        };
        bind(prevBtn, prev);
        bind(nextBtn, next);
      }

      // Dots
      const dots = document.createElement("div");
      dots.className = "gp-dots";
      dots.setAttribute("aria-hidden", "false");
      const dotBtns: any[] = slides.map((_s: any, i: number) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show slide " + (i + 1));
        if (i === 0) b.className = "gp-dot-active";
        b.addEventListener("click", (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          go(i);
        });
        dots.appendChild(b);
        return b;
      });
      slideshow.appendChild(dots);
      function updateDots() {
        dotBtns.forEach((b: any, i: number) => {
          b.className = i === current ? "gp-dot-active" : "";
        });
      }

      // Swipe / drag
      slideshow.classList.add("gp-grab");
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let dx = 0;
      let decided = false;
      let horiz = false;
      const TH = 48;
      function onDown(x: number, y: number, id: number | null) {
        if (animating) return;
        dragging = true;
        decided = false;
        horiz = false;
        dx = 0;
        startX = x;
        startY = y;
        // Capture the pointer so move events keep firing even when the cursor/finger
        // leaves the card mid-drag (mouse pointers have no implicit capture).
        if (id != null && slideshow.setPointerCapture) {
          try {
            slideshow.setPointerCapture(id);
          } catch (e) {}
        }
        slides[current].style.transition = "none";
        slideshow.classList.add("gp-grabbing");
      }
      function onMove(x: number, y: number, ev?: any) {
        if (!dragging) return;
        dx = x - startX;
        const dy = y - startY;
        if (!decided) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          decided = true;
          horiz = Math.abs(dx) > Math.abs(dy);
        }
        if (!horiz) return;
        if (ev && ev.cancelable) ev.preventDefault();
        slides[current].style.transform = "translateX(" + dx * 0.6 + "px)";
        slides[current].style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 600));
      }
      function onUp() {
        if (!dragging) return;
        dragging = false;
        slideshow.classList.remove("gp-grabbing");
        const cur = slides[current];
        if (horiz && Math.abs(dx) > TH) {
          cur.style.transition = "opacity .45s ease, transform .45s ease";
          if (dx < 0) next();
          else prev();
        } else {
          cur.style.transition = "opacity .3s ease, transform .3s ease";
          cur.style.transform = "translateX(0)";
          cur.style.opacity = "1";
        }
      }
      if (w.PointerEvent) {
        slideshow.addEventListener("pointerdown", (e: any) => {
          if (
            e.target.closest('[class*="SlideshowButton"]') ||
            e.target.closest(".gp-dots") ||
            e.target.closest("a")
          )
            return;
          onDown(e.clientX, e.clientY, e.pointerId);
        });
        slideshow.addEventListener("pointermove", (e: any) => onMove(e.clientX, e.clientY, e));
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      } else {
        slideshow.addEventListener(
          "touchstart",
          (e: any) => {
            if (
              e.target.closest('[class*="SlideshowButton"]') ||
              e.target.closest(".gp-dots") ||
              e.target.closest("a")
            )
              return;
            const t = e.touches[0];
            onDown(t.clientX, t.clientY, null);
          },
          { passive: true }
        );
        slideshow.addEventListener(
          "touchmove",
          (e: any) => {
            const t = e.touches[0];
            onMove(t.clientX, t.clientY, e);
          },
          { passive: false }
        );
        slideshow.addEventListener("touchend", onUp);
        slideshow.addEventListener("mousedown", (e: any) => {
          if (
            e.target.closest('[class*="SlideshowButton"]') ||
            e.target.closest(".gp-dots") ||
            e.target.closest("a")
          )
            return;
          onDown(e.clientX, e.clientY, null);
        });
        window.addEventListener("mousemove", (e: any) => {
          if (dragging) onMove(e.clientX, e.clientY, e);
        });
        window.addEventListener("mouseup", onUp);
      }

      // Keyboard
      slideshow.setAttribute("tabindex", slideshow.getAttribute("tabindex") || "0");
      slideshow.addEventListener("keydown", (e: any) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
      });
    }

    // ===== 2) HOMEPAGE SECTION / SUBSECTION ENTER ANIMATIONS =====
    // Every homepage <section> (and the subsections inside it) rises/fades in as
    // it scrolls into view. The hidden state is applied here in JS, so pages
    // render fully without it; sections already in view reveal on first frame.
    function initHomeEnter() {
      // Homepage only — identified by the hero section id.
      if (!document.getElementById("comp-lyozxl3u")) return;
      const root: any = document.documentElement;
      if (root.__gpEnter) return;
      root.__gpEnter = true;

      const reduce = !!(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );

      // Homepage content sections: skip the one initReveal already animates, skip
      // anything inside the (sticky) header, and keep only the outermost sections
      // so nested Wix sub-sections don't animate twice.
      const header: any = document.getElementById("comp-kbgakxea");
      let sections: any[] = Array.prototype.filter.call(
        document.querySelectorAll('section[id^="comp-"]'),
        (s: any) =>
          s.id !== "comp-lzcwzr7b" &&
          !s.closest("header") &&
          !(header && header !== s && header.contains(s))
      );
      sections = sections.filter(
        (s: any) => !sections.some((o: any) => o !== s && o.contains(s))
      );

      // Walk down single-child wrappers to the first container that branches into
      // several component boxes — those are the section's "subsections".
      function subsectionsOf(sec: any): any[] {
        let container: any =
          sec.querySelector('[data-testid="responsive-container-content"]') || sec;
        for (let i = 0; i < 6; i++) {
          const kids: any[] = Array.prototype.filter.call(
            container.children,
            (c: any) =>
              c.nodeType === 1 && /^comp-/.test(c.id || "") && c.id !== "comp-lyrl5vkw"
          );
          if (kids.length >= 2) return kids;
          if (kids.length === 1) {
            const inner =
              kids[0].querySelector('[data-testid="responsive-container-content"]') || kids[0];
            if (inner === container) break;
            container = inner;
            continue;
          }
          break;
        }
        return [];
      }

      const groups: { el: any; subs: any[] }[] = [];
      sections.forEach((sec: any) => {
        if (sec.__gpEnter) return;
        sec.__gpEnter = true;
        sec.classList.add("gp-enter");
        // Stagger subsections — but not for the hero, whose children include the
        // carousel/CTA that other enhancements already manage.
        const subs = sec.id === "comp-lyozxl3u" ? [] : subsectionsOf(sec);
        const staged: any[] = [];
        subs.forEach((el: any, i: number) => {
          if (el.classList.contains("gp-reveal")) return; // leave initReveal's targets alone
          el.classList.add("gp-enter");
          el.style.transitionDelay = 0.09 * (i + 1) + "s";
          staged.push(el);
        });
        groups.push({ el: sec, subs: staged });
      });

      const enter = (g: { el: any; subs: any[] }) => {
        g.el.classList.add("gp-entered");
        g.subs.forEach((el: any) => el.classList.add("gp-entered"));
      };

      if (reduce || !("IntersectionObserver" in window)) {
        groups.forEach(enter);
        return;
      }

      const byEl = new Map<any, { el: any; subs: any[] }>();
      groups.forEach((g) => byEl.set(g.el, g));
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              const g = byEl.get(en.target);
              if (g) enter(g);
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      groups.forEach((g) => io.observe(g.el));
    }

    // ===== 3) SCROLL-REVEAL — the "next section" fades/rises into view =====
    function initReveal() {
      const section: any = document.getElementById("comp-lzcwzr7b");
      if (!section || section.__gpReveal) return;
      section.__gpReveal = true;

      // Every element stuck at opacity:0 (Wix scroll-animations that never ran).
      // opacity is NOT inherited, so hidden children must be revealed too.
      const hidden: any[] = Array.prototype.filter.call(
        section.querySelectorAll("*"),
        (el: any) => {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          return parseFloat(cs.opacity) < 0.99;
        }
      );
      if (!hidden.length) return;

      const outer = hidden.filter(
        (el: any) => !hidden.some((o: any) => o !== el && o.contains(el))
      );
      const isOuter = (el: any) => outer.indexOf(el) !== -1;

      hidden.forEach((el: any) => {
        el.style.setProperty("opacity", "0", "important");
        if (isOuter(el)) el.classList.add("gp-reveal");
        else el.style.transition = "opacity .8s ease";
      });
      outer.sort(
        (a: any, b: any) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      );

      const reveal = () => {
        outer.forEach((el: any, i: number) => {
          window.setTimeout(() => {
            el.classList.add("gp-revealed");
            el.style.setProperty("opacity", "1", "important");
          }, i * 90);
        });
        hidden.forEach((el: any) => {
          if (!isOuter(el))
            window.setTimeout(() => el.style.setProperty("opacity", "1", "important"), 140);
        });
      };

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                reveal();
                io.disconnect();
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        );
        io.observe(section);
      } else {
        reveal();
      }
    }

    // ===== 4) MOBILE HAMBURGER MENU + LANGUAGE TOGGLE =====
    function initMenu() {
      const overlays: any[] = Array.prototype.slice.call(
        document.querySelectorAll('[data-hook="hamburger-overlay-root"]')
      );
      if (!overlays.length) return;
      const openBtns: any[] = Array.prototype.slice.call(
        document.querySelectorAll('[class*="HamburgerOpenButton"]')
      );

      const lcp = (a: string, b: string) => {
        let i = 0;
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        return i;
      };
      function overlayFor(btn: any) {
        if (btn.id) {
          let best: any = null;
          let bestLen = -1;
          overlays.forEach((ov: any) => {
            if (!ov.id) return;
            const l = lcp(btn.id, ov.id);
            if (l > bestLen) {
              bestLen = l;
              best = ov;
            }
          });
          if (best && bestLen > 4) return best;
        }
        let n: any = btn;
        while (n) {
          const ov = n.querySelector && n.querySelector('[data-hook="hamburger-overlay-root"]');
          if (ov) return ov;
          n = n.parentElement;
        }
        return overlays[0];
      }

      function lockScroll(lock: boolean) {
        document.body.style.overflow = lock ? "hidden" : "";
      }
      function open(ov: any) {
        ov.classList.add("gp-menu-open");
        ov.setAttribute("data-visible", "true");
        lockScroll(true);
        const focusable = ov.querySelector("button[aria-label], a[href]");
        if (focusable)
          try {
            focusable.focus();
          } catch (e) {}
      }
      function close(ov: any) {
        ov.classList.remove("gp-menu-open");
        ov.setAttribute("data-visible", "false");
        if (!document.querySelector('[data-hook="hamburger-overlay-root"].gp-menu-open'))
          lockScroll(false);
      }
      const isOpen = (ov: any) => ov.classList.contains("gp-menu-open");

      openBtns.forEach((btn: any) => {
        if (btn.__gpBound) return;
        btn.__gpBound = true;
        btn.addEventListener(
          "click",
          (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            const ov = overlayFor(btn);
            if (ov) open(ov);
          },
          true
        );
      });

      overlays.forEach((ov: any) => {
        if (ov.__gpBound) return;
        ov.__gpBound = true;
        Array.prototype.slice
          .call(
            ov.querySelectorAll(
              '[class*="HamburgerCloseButton"], button[aria-label="Close"], button[aria-label="Cerrar"]'
            )
          )
          .forEach((cb: any) => {
            cb.addEventListener(
              "click",
              (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                close(ov);
              },
              true
            );
          });
        const backdrop = ov.querySelector('[class*="HamburgerOverlay"][class*="overlay"]');
        if (backdrop)
          backdrop.addEventListener("click", (e: any) => {
            if (e.target === backdrop) close(ov);
          });
        Array.prototype.slice.call(ov.querySelectorAll("a[href]")).forEach((a: any) => {
          a.addEventListener("click", () => close(ov));
        });
        injectLangToggle(ov);
      });

      if (!doc.__gpEscBound) {
        doc.__gpEscBound = true;
        document.addEventListener("keydown", (e: any) => {
          if (e.key === "Escape" || e.key === "Esc") {
            Array.prototype.forEach.call(
              document.querySelectorAll('[data-hook="hamburger-overlay-root"].gp-menu-open'),
              close
            );
          }
        });
      }
    }

    function injectLangToggle(container: any) {
      if (container.querySelector(".gp-lang")) return;
      const get = (sel: string) => {
        const l = document.querySelector(sel);
        return l ? l.getAttribute("href") : null;
      };
      const enHref =
        get('link[rel="alternate"][hreflang="en-us"]') ||
        get('link[rel="alternate"][hreflang="x-default"]');
      const esHref =
        get('link[rel="alternate"][hreflang="es-mx"]') ||
        get('link[rel="alternate"][hreflang^="es"]');
      if (!enHref && !esHref) return;
      const cur =
        (document.documentElement.getAttribute("lang") || "en").toLowerCase().indexOf("es") === 0
          ? "es"
          : "en";

      const wrap = document.createElement("div");
      wrap.className = "gp-lang";
      wrap.setAttribute("role", "navigation");
      wrap.setAttribute("aria-label", "Language");

      const link = (href: string | null, label: string, code: string) => {
        const a = document.createElement("a");
        if (cur === code) {
          a.className = "gp-current";
          a.setAttribute("aria-current", "true");
          a.removeAttribute("href");
        } else if (href) {
          a.setAttribute("href", href);
        }
        a.textContent = label;
        return a;
      };
      const sep = document.createElement("span");
      sep.className = "gp-sep";
      sep.textContent = "/";
      wrap.appendChild(link(enHref, "English", "en"));
      wrap.appendChild(sep);
      wrap.appendChild(link(esHref, "Español", "es"));

      const nav =
        container.querySelector('.wixui-vertical-menu, nav[aria-label="Site"], nav');
      if (nav && nav.parentNode) nav.parentNode.insertBefore(wrap, nav.nextSibling);
      else container.appendChild(wrap);
    }

    // ----- boot -----
    const run = () => {
      safe("home-enter", initHomeEnter);
      safe("carousel", initCarousel);
      safe("reveal", initReveal);
      safe("menu", initMenu);
    };
    run();
    // Re-run a couple of times to catch any late layout/measurement.
    const t1 = window.setTimeout(run, 600);
    const t2 = window.setTimeout(run, 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
