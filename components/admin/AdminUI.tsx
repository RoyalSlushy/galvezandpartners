"use client";

import { useAdmin } from "./AdminProvider";
import AdminDrawer from "./AdminDrawer";
import LoginPopover from "./LoginPopover";
import ImagePicker from "./ImagePicker";
import ThemeApplier from "./ThemeApplier";

/** Everything the admin sees on top of the site. Loaded lazily (never for
 * anonymous visitors) via the dynamic import in AdminProvider. */
export default function AdminUI() {
  const admin = useAdmin();
  return (
    <>
      <ThemeApplier />
      {admin.loginOpen && admin.auth !== "authed" && <LoginPopover />}
      {admin.auth === "authed" && <AdminDrawer />}
      {admin.picker && <ImagePicker key={admin.picker.path} />}
      {admin.editingInfo && <EditingHint />}
      <ToastHost />
    </>
  );
}

/** Bottom-left helper shown while a text edit is in progress. */
function EditingHint() {
  const { editingInfo } = useAdmin();
  if (!editingInfo) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[75] flex items-center gap-3 rounded-full border border-white/10 bg-navy-soft/95 py-2 pl-4 pr-5 text-xs shadow-xl backdrop-blur">
      <span className="font-heading uppercase tracking-widest text-gold">
        {editingInfo.label}
      </span>
      <span className="text-white/60">
        Enter <span className="text-white/35">apply</span>
        {editingInfo.multiline && (
          <>
            {" · "}Shift+Enter <span className="text-white/35">new line</span>
          </>
        )}
        {" · "}Esc <span className="text-white/35">cancel</span>
      </span>
    </div>
  );
}

function ToastHost() {
  const { toasts } = useAdmin();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[90] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-xl border px-4 py-2 text-sm shadow-xl backdrop-blur ${
            t.kind === "err"
              ? "border-red-400/40 bg-red-950/90 text-red-200"
              : "border-white/10 bg-navy-soft/95 text-white/90"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
