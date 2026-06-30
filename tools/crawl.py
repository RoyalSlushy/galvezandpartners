#!/usr/bin/env python3
"""
Crawl galvezandpartners.com (Wix Thunderbolt SSR site) into a static, browsable
multi-page mirror.

- Downloads the server-rendered HTML for every URL in the site's sitemaps
  (English + Spanish, including dynamic case-study pages).
- Saves each page into a directory layout that mirrors the URL path.
- Rewrites internal navigation links (<a href>, <link href> alternates/canonical)
  that point at a captured page to a *relative local* path, so the mirror can be
  browsed offline by clicking through it.
- Leaves Wix CDN asset URLs (wixstatic / parastorage / wixapps) absolute, exactly
  like the original page source, so styling + images load when online.
"""
import os
import re
import sys
import time
import subprocess
import html as htmllib
from urllib.parse import unquote

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
BASE = "https://www.galvezandpartners.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# Path slugs discovered from the sitemaps (no leading slash; "" == home).
EN_PAGES = [
    "",
    "our-works",
    "our-team",
    "our-partners",
    "our-partners-list",
    "contact-us",
    "case-study",
    "o",
    "case-study/case-study-6",
    "case-study/arizona-alzheimer's-consortium",
    "case-study/la-bombita",
    "case-study/helios-education-foundation",
    "case-study/precision-aging-network",
    "case-study/elg-accident-attorneys",
]
# Spanish mirror lives under /es
ES_PAGES = ["es" if p == "" else f"es/{p}" for p in EN_PAGES]
PAGES = EN_PAGES + ES_PAGES


def local_path(slug):
    """Map a URL slug to a local file path."""
    if slug == "":
        return "index.html"
    if slug == "es":
        return "es/index.html"
    return f"{slug}.html"


# slug (normalized, no leading/trailing slash) -> local file path
SLUG_TO_LOCAL = {p: local_path(p) for p in PAGES}


def fetch(url, tries=4):
    """Fetch via curl, which handles this site's chunked transfers reliably."""
    delay = 2
    last = None
    for attempt in range(tries):
        p = subprocess.run(
            ["curl", "-sS", "--compressed", "--fail", "-A", UA,
             "--max-time", "90", "-w", "\n__HTTP__:%{http_code}", url],
            capture_output=True,
        )
        out = p.stdout.decode("utf-8", "replace")
        marker = out.rfind("\n__HTTP__:")
        if p.returncode == 0 and marker != -1:
            body = out[:marker]
            status = int(out[marker + len("\n__HTTP__:"):].strip() or 0)
            return body, status
        last = p.stderr.decode("utf-8", "replace").strip() or f"rc={p.returncode}"
        if attempt < tries - 1:
            time.sleep(delay)
            delay *= 2
    raise RuntimeError(last)


# Match href="...galvezandpartners.com..." attribute occurrences only
# (real attribute quoting; will not match JSON "href":"..." keys).
LINK_RE = re.compile(
    r'href="(https?://(?:www\.)?galvezandpartners\.com[^"]*)"'
)
DOMAIN_RE = re.compile(r'^https?://(?:www\.)?galvezandpartners\.com')


def rewrite_links(html, current_slug):
    current_local = SLUG_TO_LOCAL[current_slug]
    current_dir = os.path.dirname(current_local)

    def repl(m):
        raw = m.group(1)
        rest = DOMAIN_RE.sub("", raw, count=1)
        # Decode HTML entities (&#x27; &#39; &amp;) then percent-encoding (%27)
        # so apostrophes/ampersands resolve to the literal slug we saved under.
        decoded = unquote(htmllib.unescape(rest))
        path = decoded.split("?", 1)[0].split("#", 1)[0]
        slug = path.strip("/")
        target = SLUG_TO_LOCAL.get(slug)
        if target is None:
            # Not a captured page -> keep absolute so it still works online.
            return m.group(0)
        rel = os.path.relpath(target, current_dir or ".")
        frag = "#" + decoded.split("#", 1)[1] if "#" in decoded else ""
        return f'href="{rel}{frag}"'

    return LINK_RE.sub(repl, html)


def main():
    results = []
    for slug in PAGES:
        url = f"{BASE}/{slug}" if slug else f"{BASE}/"
        try:
            html, status = fetch(url)
        except Exception as e:  # noqa
            print(f"FAIL  {url}  ({e})")
            results.append((slug, None, 0, "ERROR"))
            continue
        rewritten = rewrite_links(html, slug)
        dest = os.path.join(OUT, SLUG_TO_LOCAL[slug])
        os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(rewritten)
        n_rw = len(LINK_RE.findall(html))
        print(f"OK    {status}  {len(rewritten):>9} bytes  ->  {SLUG_TO_LOCAL[slug]}"
              f"   ({n_rw} internal links seen)")
        results.append((slug, SLUG_TO_LOCAL[slug], len(rewritten), status))
        time.sleep(0.5)  # be polite

    ok = [r for r in results if r[3] == 200]
    print(f"\n{len(ok)}/{len(results)} pages captured OK")
    return 0 if len(ok) == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
