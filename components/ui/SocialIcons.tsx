"use client";

import { useState } from "react";
import { type Social } from "@/content/site";
import { useEditMode } from "@/components/admin/AdminProvider";
import SocialEditPopover from "@/components/admin/editable/SocialEditPopover";

const PATHS: Record<Social["icon"], string> = {
  facebook:
    "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.97 10.13 11.85v-8.38H7.08v-3.47h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.47h-2.8V24C19.61 23.04 24 18.07 24 12.07z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.12-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.12C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zM12 16a4 4 0 114-4 4 4 0 01-4 4zm6.41-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 11.01-4.13 2.06 2.06 0 01-.01 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z",
  tiktok:
    "M16.6 5.82a4.28 4.28 0 01-1.06-2.82h-3.3v13.2a2.59 2.59 0 01-2.59 2.5 2.59 2.59 0 01-2.59-2.59 2.59 2.59 0 013.4-2.46V10.3a5.9 5.9 0 00-.81-.06 5.9 5.9 0 105.9 5.9V9.09a7.55 7.55 0 004.4 1.41V7.2a4.28 4.28 0 01-3.35-1.38z",
};

/** Inline social icons (white), used in header and footer. When
 * `editPathBase` is set, edit mode turns each icon into a popover editor. */
export default function SocialIcons({
  socials,
  className = "",
  iconClassName = "",
  editPathBase,
}: {
  socials: Social[];
  className?: string;
  iconClassName?: string;
  editPathBase?: string;
}) {
  const editMode = useEditMode();
  const [editing, setEditing] = useState<{
    index: number;
    pos: { top: number; left: number };
  } | null>(null);

  const editable = Boolean(editPathBase) && editMode;

  return (
    <ul className={`flex items-center gap-4 ${className}`}>
      {socials.map((s, i) => (
        <li key={i}>
          <a
            href={s.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={s.label}
            className="block text-white transition hover:text-gold"
            {...(editable
              ? {
                  "data-gp-editable": "",
                  title: `Edit ${s.label || "social link"}`,
                  onClickCapture: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setEditing({
                      index: i,
                      pos: {
                        top: Math.min(rect.bottom + 8, window.innerHeight - 320),
                        left: Math.max(8, Math.min(rect.left - 120, window.innerWidth - 300)),
                      },
                    });
                  },
                }
              : null)}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-6 w-6 fill-current ${iconClassName}`}
              aria-hidden="true"
            >
              <path d={PATHS[s.icon]} />
            </svg>
          </a>
        </li>
      ))}
      {editing && editPathBase && (
        <SocialEditPopover
          basePath={editPathBase}
          index={editing.index}
          pos={editing.pos}
          onClose={() => setEditing(null)}
        />
      )}
    </ul>
  );
}
