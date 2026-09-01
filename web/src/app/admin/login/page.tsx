import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return <LoginForm />;
}
