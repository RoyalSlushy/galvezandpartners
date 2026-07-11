import type { Config } from "tailwindcss";

/**
 * Design tokens extracted from the original Wix site's master CSS.
 * Colors come from the `--color_N` palette; the fluid `fontSize` scale
 * approximates Wix's `calc(N * var(--theme-spx-ratio))` sizing with `clamp()`.
 */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand tokens resolve against CSS variables (space-separated RGB
        // triplets) so the admin can switch the whole site's theme at runtime.
        // Defaults live in `:root` (app/globals.css); presets in lib/themes.ts.
        navy: "rgb(var(--c-navy) / <alpha-value>)", // --color_15, primary dark / text
        "navy-soft": "rgb(var(--c-navy-soft) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)", // --color_17, accent
        "gold-bright": "rgb(var(--c-gold-bright) / <alpha-value>)", // enhance.css accent (carousel dots, current lang)
        "gold-dark": "rgb(var(--c-gold-dark) / <alpha-value>)", // --color_18
        cream: "rgb(var(--c-cream) / <alpha-value>)", // --color_16
        "brown-deep": "rgb(var(--c-brown-deep) / <alpha-value>)", // --color_19
        ink: {
          100: "#c0c6d3", // --color_11
          200: "#959ba7", // --color_12
          300: "#696f7c", // --color_13
          400: "#3e4450", // --color_14
          500: "#141924", // --color_15
        },
        "blue-cta": "#045aff",
        "blue-muted": "#4d608a",
      },
      fontFamily: {
        // families are declared as @font-face in globals.css and exposed as CSS vars
        display: ["var(--font-display)", "Georgia", "serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        din: ["din-next-w01-light", "Arial", "sans-serif"],
      },
      fontSize: {
        // clamp() approximations of Wix --font_0.._10 (design base ~1800px wide)
        f0: ["clamp(3.25rem, 8.2vw, 9.25rem)", { lineHeight: "1.2em" }], // 148px display
        f2: ["clamp(2.4rem, 4.8vw, 5.375rem)", { lineHeight: "1.3em" }], // 86px
        f3: ["clamp(2.1rem, 4.3vw, 4.875rem)", { lineHeight: "1.3em" }], // 78px
        f4: ["clamp(1.9rem, 3.8vw, 4.3125rem)", { lineHeight: "1.3em" }], // 69px
        f5: ["clamp(1.7rem, 3.2vw, 3.625rem)", { lineHeight: "1.3em" }], // 58px
        f6: ["clamp(1.5rem, 2.4vw, 2.75rem)", { lineHeight: "1.4em" }], // 44px
        f7: ["clamp(1.25rem, 2vw, 2.3125rem)", { lineHeight: "1.6em" }], // 37px
        f8: ["clamp(1.15rem, 1.8vw, 2.0625rem)", { lineHeight: "1.6em" }], // 33px
        f9: ["clamp(1.05rem, 1.6vw, 1.8125rem)", { lineHeight: "1.6em" }], // 29px
        f1: ["1rem", { lineHeight: "1.4em" }], // 16px din
        f10: ["0.75rem", { lineHeight: "1.4em" }], // 12px din
      },
      maxWidth: {
        site: "1200px", // canonical site width (header + body containers)
      },
      screens: {
        // Wix breakpoints: mobile <= 750, tablet <= 1000
        sm: "751px",
        md: "1001px",
      },
    },
  },
  plugins: [],
} satisfies Config;
