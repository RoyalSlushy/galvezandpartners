"use client";

import { useAdmin, useEditMode } from "@/components/admin/AdminProvider";
import { labelFor } from "@/lib/adminSchema";

type EditableImageProps = {
  /** Content path of the stored image string, e.g. "team.members.0.photo". */
  path: string;
  /** The stored value (full URL or bare Wix media id) — draft-aware. */
  raw: string;
  /** The resolved URL actually rendered (caller applies its own sizing). */
  src: string;
  alt: string;
  className?: string;
  label?: string;
};

/**
 * A CMS-managed <img>. Renders exactly as today for visitors; in edit mode it
 * highlights and clicking it opens the visual image picker for this field.
 */
export default function EditableImage({
  path,
  raw,
  src,
  alt,
  className,
  label,
}: EditableImageProps) {
  const editMode = useEditMode();
  const admin = useAdmin();
  const fieldLabel = label ?? labelFor(path);

  const editProps = editMode
    ? {
        "data-gp-editable": "",
        title: `Change ${fieldLabel}`,
        onClickCapture: (e: React.MouseEvent) => {
          // Swallow the click so wrapping <Link> cards don't navigate.
          e.preventDefault();
          e.stopPropagation();
          admin.openImagePicker({ path, raw });
        },
      }
    : null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} {...editProps} />;
}
