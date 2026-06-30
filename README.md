# galvezandpartners.com — site clone

A static clone of **galvezandpartners.com** (Galvez & Partners / G&P Advertising,
a Phoenix, AZ advertising & marketing firm).

## Status

| Page | Path | Status |
|------|------|--------|
| Home | `/` | ✅ captured (`index.html`) |
| Our Works | `/our-works` | ⏳ not yet captured |
| Our Team | `/our-team` | ⏳ not yet captured |
| Our Partners | `/our-partners` | ⏳ not yet captured |
| Our Partners List | `/our-partners-list` | ⏳ not yet captured |
| Contact Us | `/contact-us` | ⏳ not yet captured |
| Spanish home | `/es` | ⏳ not yet captured |
| Case studies | `/case-study/*` | ⏳ not yet captured |

## How this was built

The live site is hosted on **Wix (Thunderbolt)**. It could not be crawled
automatically from the build environment (the site's WAF blocks automated
fetchers and this environment's network policy blocks direct downloads), so the
clone is assembled from browser **"Save Page As → Webpage, Complete"** captures
provided by the site owner.

`index.html` is the saved homepage, committed byte-for-byte as provided.

## Assets

The saved homepage references a companion assets folder,
`Home _ G&P Advertising_files/` (JavaScript bundles, CSS, and images), and a
number of Wix CDN hosts (`static.wixstatic.com`, `static.parastorage.com`).

- The page's **text content is server-rendered inline**, so headings and copy
  display even without the assets.
- Full styling, scripts, and images require the companion assets folder (drop
  its contents into `Home _ G&P Advertising_files/`) and/or network access to
  the Wix CDNs.

## To complete the full-site clone

For each remaining page above, save it from the browser
(`File → Save Page As → Webpage, Complete`) and add both the `.html` file and
its `_files` folder to the repo (or zip the whole save and upload it). Once
provided, each page is wired into this static structure.

## Network setup (for automated crawling in a Claude Code web session)

To let a cloud session crawl and mirror the live site directly (instead of
hand-saving each page), the environment's outbound network access must be
opened to the site + its Wix CDN hosts. Default Claude Code environments use
the **Trusted** policy, which only allows package registries/git — so the
crawl is blocked until this is changed.

**Steps (done once, per environment):**

1. In the Claude Code web app, open the environment switcher and click the
   **⚙️ gear** next to the cloud environment (e.g. `Default`) to edit it.
   (Or use **"+ Add cloud environment…"** to create one with these settings.)
2. In the dialog, set **Network access** to **Custom** (or **Full**).
3. With **Custom**, an **Allowed domains** field appears — add, one per line:

   ```text
   galvezandpartners.com
   www.galvezandpartners.com
   *.wixstatic.com
   *.parastorage.com
   *.wixapps.net
   *.wix.com
   ```

   Keep **"Also include default list of common package managers"** checked so
   git/npm keep working.
4. **Save**, then **start a new session** — network rules are fixed at session
   start, so changes only apply to a fresh session.

Those Wix hosts serve the site's images (`static.wixstatic.com`,
`video.wixstatic.com`), CSS/JS bundles (`static.parastorage.com`,
`siteassets.parastorage.com`), and runtime data (`panorama.wixapps.net`).

**Then, in the new session:** ask Claude to *"crawl galvezandpartners.com"* on
branch `claude/galvezandpartners-clone-tyjm94`. It will drive the pre-installed
headless Chromium to spider every page listed under **Status**, download the
HTML + CSS/JS/images, rewrite links to be local, and commit a self-contained
mirror.

> **Caveat:** opening egress is necessary but may not be sufficient — the live
> site sits behind a Wix WAF that returns `403` to automated fetchers. A real
> headless browser usually passes its bot check, but if it doesn't, fall back
> to uploading browser **"Save Page As → Complete"** captures (see *To complete
> the full-site clone* above). The two approaches can be mixed.

## Viewing locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```
