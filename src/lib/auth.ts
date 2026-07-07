import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "boxing_staff";

export async function requireStaff() {
  if ((await cookies()).get(COOKIE)?.value !== "ok") redirect("/login");
}

export async function setStaffSession() {
  (await cookies()).set(COOKIE, "ok", { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
}

export async function clearStaffSession() {
  (await cookies()).delete(COOKIE);
}
