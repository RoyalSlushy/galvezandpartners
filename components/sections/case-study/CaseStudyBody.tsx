"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { CaseStudy } from "@/content/caseStudies";
import { wixImageFit } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useAdmin, useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls from "@/components/admin/editable/ListControls";
import { ImageIcon, TrashIcon } from "@/components/admin/icons";

/**
 * Case-study article (title, background, gallery). The page stays a server
 * component (metadata + notFound); this client body makes it editable.
 */
export default function CaseStudyBody({
  index: serverIndex,
  study: serverStudy,
}: {
  index: number;
  study: CaseStudy;
}) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const t = useT();
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));
  const draftStudies = useCmsValue<CaseStudy[] | null>("case_studies.studies", null);

  // While editing, follow the draft: locate this study by slug (stable across
  // list reorders), falling back to the server index.
  let index = serverIndex;
  let cs: CaseStudy | undefined = serverStudy;
  if (editMode && Array.isArray(draftStudies)) {
    const bySlug = draftStudies.findIndex((s) => s.slug === serverStudy.slug);
    index = bySlug >= 0 ? bySlug : serverIndex;
    cs = draftStudies[index];
  }

  if (!cs) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-navy px-6 text-center">
        <div>
          <p className="font-heading text-xl text-white/80">
            This case study is deleted in your unsaved changes.
          </p>
          <p className="mt-2 text-sm text-white/50">
            Save to make it permanent, or discard your changes to bring it back.
          </p>
        </div>
      </div>
    );
  }

  const base = `case_studies.studies.${index}`;

  return (
    <article className="w-full bg-navy">
      {editMode && (
        <div className="border-b border-gold/20 bg-gold/5">
          <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-xs text-white/60">
              Editing case study <span className="text-gold">{cs.slug}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this entire case study? (Takes effect when you save.)",
                  )
                ) {
                  admin.listOp("case_studies.studies", { type: "remove", index });
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-400/10"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete this case study
            </button>
          </Container>
        </div>
      )}

      <header className="border-b border-white/10 py-20 sm:py-28">
        <Container>
          <Link href="/our-works" className="font-din text-sm uppercase tracking-widest text-gold hover:underline">
            {"← "}
            {t("Our Work")}
          </Link>
          <EditableText
            path={`${base}.title`}
            value={cs.title}
            as="h1"
            className="mt-4 font-heading text-f2 leading-none text-white"
          />
        </Container>
      </header>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-f6 uppercase tracking-wide text-gold">{t("Background")}</h2>
          <EditableText
            path={`${base}.background`}
            value={tv(cs.background)}
            as="p"
            multiline
            className="mt-4 max-w-3xl whitespace-pre-line font-body text-f8 text-white/80"
          />
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2">
            {cs.gallery.map((id, i) => (
              <RevealOnScroll key={i} delay={0.05 * (i % 2)} className={editMode ? "relative" : ""}>
                <EditableImage
                  path={`${base}.gallery.${i}`}
                  raw={id}
                  src={id ? (id.startsWith("http") ? id : wixImageFit(id, 900, 900)) : PLACEHOLDER_IMG}
                  alt={`${cs.title} — image ${i + 1}`}
                  className="w-full rounded-2xl bg-navy-soft object-contain"
                />
                {editMode && (
                  <ListControls
                    listPath={`${base}.gallery`}
                    index={i}
                    count={cs.gallery.length}
                    label="gallery image"
                    className="top-2 right-2"
                  />
                )}
              </RevealOnScroll>
            ))}
            {editMode && (
              <button
                type="button"
                onClick={() =>
                  admin.openImagePicker({
                    path: `${base}.gallery.${cs.gallery.length}`,
                    raw: "",
                  })
                }
                className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-14 text-white/50 transition hover:border-gold/60 hover:text-gold"
              >
                <ImageIcon className="h-6 w-6" />
                <span className="font-heading text-sm">Add gallery image</span>
              </button>
            )}
          </div>
        </Container>
      </section>
    </article>
  );
}
