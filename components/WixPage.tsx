import Enhancements from "./Enhancements";

/**
 * Renders a captured Wix page's markup (inlined CSS + body) exactly as-is.
 * The `display:contents` wrapper means the injected #SITE_CONTAINER behaves as a
 * direct child of <body>, so the Wix layout/CSS resolves like the original page.
 * Interactivity is restored by the client-side <Enhancements /> component.
 */
export default function WixPage({ html }: { html: string }) {
  return (
    <>
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
      <Enhancements />
    </>
  );
}
