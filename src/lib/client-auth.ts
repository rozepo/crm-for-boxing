import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE = "boxing_client";

export async function setClientSession(clientId: number) {
  (await cookies()).set(COOKIE, String(clientId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
}

export async function clearClientSession() {
  (await cookies()).delete(COOKIE);
}

export async function getClient() {
  const id = Number((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  return prisma.client.findUnique({ where: { id }, include: { passes: { orderBy: { purchasedAt: "desc" } } } });
}

export async function requireClient() {
  const client = await getClient();
  if (!client) redirect("/book/login");
  return client;
}
