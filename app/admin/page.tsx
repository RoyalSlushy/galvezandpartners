import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** The CMS now lives in the site itself (footer gear → bottom-right drawer). */
export default function AdminPage() {
  redirect("/");
}
