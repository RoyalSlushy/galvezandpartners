import AdminApp from "./AdminApp";
import { getAllContent } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const content = await getAllContent();
  return <AdminApp initial={content} />;
}
