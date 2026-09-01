import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  redirect((await isAdminAuthenticated()) ? "/admin/intakes" : "/admin/login");
}
