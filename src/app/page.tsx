import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

export default async function Home() {
  await requireStaff();
  redirect("/admin/schedule");
}
