"use server";

import { BookingStatus, Level, PassType, RecurrenceFrequency, SessionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAttendance } from "@/lib/attendance";
import { resolveEndTime } from "@/lib/time";
import { clearStaffSession, requireStaff, setStaffSession } from "@/lib/auth";
import { cancelBooking, createBooking } from "@/lib/booking";
import { clearClientSession, requireClient, setClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { createRecurringSchedule, updateRecurringSchedule } from "@/lib/recurrence";

function parseTrainerIds(formData: FormData) {
  return formData.getAll("trainerIds").map((value) => Number(value)).filter(Boolean);
}

function revalidateClientAndTrainerPages(clientId?: number, trainerId?: number) {
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  if (trainerId) revalidatePath(`/admin/trainers/${trainerId}`);
  revalidatePath("/admin");
}

export async function login(formData: FormData) {
  if (String(formData.get("pin")) !== (process.env.STAFF_PIN || "1234")) redirect("/login?error=1");
  await setStaffSession();
  redirect("/");
}

export async function logout() {
  await clearStaffSession();
  redirect("/login");
}

export async function updateAttendance(formData: FormData) {
  await requireStaff();
  await setAttendance(Number(formData.get("bookingId")), String(formData.get("status")) as BookingStatus);
  const sessionId = Number(formData.get("sessionId"));
  if (sessionId) revalidatePath(`/admin/schedule/session/${sessionId}`);
  revalidatePath("/admin/schedule");
}

export async function setSessionStatus(formData: FormData) {
  await requireStaff();
  const sessionId = Number(formData.get("sessionId"));
  const status = String(formData.get("status")) as SessionStatus;
  await prisma.session.update({ where: { id: sessionId }, data: { status } });
  revalidatePath(`/admin/schedule/session/${sessionId}`);
  revalidatePath("/admin/schedule");
}

export async function updateSessionDescription(formData: FormData) {
  await requireStaff();
  const sessionId = Number(formData.get("sessionId"));
  await prisma.session.update({
    where: { id: sessionId },
    data: { description: String(formData.get("description")).trim() || null },
  });
  revalidatePath(`/admin/schedule/session/${sessionId}`);
}

export async function createClient(formData: FormData) {
  await requireStaff();
  const client = await prisma.client.create({ data: {
    name: String(formData.get("name")),
    phone: String(formData.get("phone")).replace(/\s/g, ""),
    level: String(formData.get("level")) as Level,
    isFree: formData.get("isFree") === "on",
    note: String(formData.get("note") || "").trim() || null,
  } });
  revalidateClientAndTrainerPages(client.id);
}

export async function updateClient(formData: FormData) {
  await requireStaff();
  const clientId = Number(formData.get("clientId"));
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: String(formData.get("name")).trim(),
      phone: String(formData.get("phone")).replace(/\s/g, ""),
      level: String(formData.get("level")) as Level,
      isFree: formData.get("isFree") === "on",
      note: String(formData.get("note") || "").trim() || null,
    },
  });
  revalidateClientAndTrainerPages(clientId);
}

export async function createTrainer(formData: FormData) {
  await requireStaff();
  const trainer = await prisma.trainer.create({
    data: {
      name: String(formData.get("name")).trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      bio: String(formData.get("bio") || "").trim() || null,
    },
  });
  revalidateClientAndTrainerPages(undefined, trainer.id);
}

export async function updateTrainer(formData: FormData) {
  await requireStaff();
  const trainerId = Number(formData.get("trainerId"));
  await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      name: String(formData.get("name")).trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      bio: String(formData.get("bio") || "").trim() || null,
    },
  });
  revalidateClientAndTrainerPages(undefined, trainerId);
}

export async function sellPass(formData: FormData) {
  await requireStaff();
  const type = String(formData.get("type")) as PassType;
  const remaining = type === PassType.UNLIMITED ? null : Number(formData.get("remaining"));
  await prisma.pass.create({ data: {
    clientId: Number(formData.get("clientId")), type, remaining,
    priceRub: Number(formData.get("priceRub")), paidCash: true,
    validUntil: type === PassType.UNLIMITED ? new Date(Date.now() + 30 * 86400000) : null,
  } });
  revalidateClientAndTrainerPages(Number(formData.get("clientId")));
}

export async function clientLogin(formData: FormData) {
  const phone = String(formData.get("phone")).replace(/\D/g, "");
  const clients = await prisma.client.findMany({ select: { id: true, phone: true } });
  const client = clients.find((item) => item.phone.replace(/\D/g, "").endsWith(phone.slice(-10)));
  if (!client || phone.length < 10) redirect("/book/login?error=1");
  await setClientSession(client.id);
  redirect("/book");
}

export async function clientLogout() {
  await clearClientSession();
  redirect("/book/login");
}

export async function bookSession(formData: FormData) {
  const client = await requireClient();
  try {
    await createBooking(client.id, Number(formData.get("sessionId")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось записаться";
    redirect(`/book?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/book");
  revalidatePath("/");
}

export async function unbookSession(formData: FormData) {
  const client = await requireClient();
  try {
    await cancelBooking(client.id, Number(formData.get("sessionId")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отменить запись";
    redirect(`/book?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/book");
  revalidatePath("/");
}

export async function createSession(formData: FormData) {
  await requireStaff();
  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const endTime = resolveEndTime(startTime, String(formData.get("endTime")));
  const description = String(formData.get("description") || "").trim();
  const trainerIds = parseTrainerIds(formData);
  if (trainerIds.length === 0) throw new Error("Нужно выбрать хотя бы одного тренера");
  await prisma.session.create({
    data: {
      date: new Date(`${date}T${startTime}:00`),
      startTime,
      endTime,
      title: String(formData.get("title") || "").trim() || null,
      description: description || null,
      level: String(formData.get("level")) as Level,
      trainerId: trainerIds[0],
      trainerLinks: { create: trainerIds.map((trainerId) => ({ trainerId })) },
      capacity: Number(formData.get("capacity")),
    },
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/book");
}

export async function createRecurringSessions(formData: FormData) {
  await requireStaff();
  const date = String(formData.get("startsOn"));
  const endsOn = String(formData.get("endsOn"));
  const weekDays = formData.getAll("weekDays").map(Number);
  await createRecurringSchedule({
    frequency: String(formData.get("frequency")) as RecurrenceFrequency,
    interval: Number(formData.get("interval")), weekDays,
    monthlyMode: String(formData.get("monthlyMode") || "DAY_OF_MONTH") as "DAY_OF_MONTH" | "NTH_WEEKDAY",
    monthDay: Number(formData.get("monthDay") || 0) || null,
    nthWeek: Number(formData.get("nthWeek") || 0) || null,
    nthWeekday: Number(formData.get("nthWeekday") || 0) || null,
    startsOn: new Date(`${date}T00:00:00`), endsOn: endsOn ? new Date(`${endsOn}T23:59:59`) : null,
    startTime: String(formData.get("startTime")), endTime: resolveEndTime(String(formData.get("startTime")), String(formData.get("endTime"))),
    title: String(formData.get("title") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    level: String(formData.get("level")) as Level,
    capacity: Number(formData.get("capacity")), trainerIds: parseTrainerIds(formData),
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/book");
}

export async function updateSession(formData: FormData) {
  await requireStaff();
  const sessionId = Number(formData.get("sessionId"));
  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const trainerIds = parseTrainerIds(formData);
  if (trainerIds.length === 0) throw new Error("Нужно выбрать хотя бы одного тренера");
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      date: new Date(`${date}T${startTime}:00`),
      startTime,
      endTime: resolveEndTime(startTime, String(formData.get("endTime"))),
      title: String(formData.get("title") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      level: String(formData.get("level")) as Level,
      capacity: Number(formData.get("capacity")),
      trainerId: trainerIds[0],
      trainerLinks: {
        deleteMany: {},
        create: trainerIds.map((trainerId) => ({ trainerId })),
      },
    },
  });
  revalidatePath(`/admin/schedule/session/${sessionId}`);
  revalidatePath("/admin/schedule");
  revalidatePath("/book");
}

export async function updateRecurringSeriesAction(formData: FormData) {
  await requireStaff();
  const ruleId = Number(formData.get("ruleId"));
  const startsOn = String(formData.get("startsOn"));
  const endsOn = String(formData.get("endsOn"));
  await updateRecurringSchedule(ruleId, {
    frequency: String(formData.get("frequency")) as RecurrenceFrequency,
    interval: Number(formData.get("interval")),
    weekDays: formData.getAll("weekDays").map(Number),
    monthlyMode: String(formData.get("monthlyMode") || "DAY_OF_MONTH") as "DAY_OF_MONTH" | "NTH_WEEKDAY",
    monthDay: Number(formData.get("monthDay") || 0) || null,
    nthWeek: Number(formData.get("nthWeek") || 0) || null,
    nthWeekday: Number(formData.get("nthWeekday") || 0) || null,
    startsOn: new Date(`${startsOn}T00:00:00`),
    endsOn: endsOn ? new Date(`${endsOn}T23:59:59`) : null,
    startTime: String(formData.get("startTime")),
    endTime: resolveEndTime(String(formData.get("startTime")), String(formData.get("endTime"))),
    title: String(formData.get("title") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    level: String(formData.get("level")) as Level,
    capacity: Number(formData.get("capacity")),
    trainerIds: parseTrainerIds(formData),
  });
  revalidatePath(`/admin/schedule/series/${ruleId}`);
  revalidatePath("/admin/schedule");
  revalidatePath("/book");
}
