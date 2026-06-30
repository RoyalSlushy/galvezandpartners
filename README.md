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

## Viewing locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```
