import { Prisma, RecurrenceFrequency } from "@prisma/client";
import { prisma } from "./prisma";

export type RecurrenceInput = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekDays?: number[];
  monthlyMode?: "DAY_OF_MONTH" | "NTH_WEEKDAY";
  monthDay?: number | null;
  nthWeek?: number | null;
  nthWeekday?: number | null;
  startsOn: Date;
  endsOn?: Date | null;
  startTime: string;
  endTime?: string | null;
  title?: string | null;
  description?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  capacity: number;
  trainerIds: number[];
};

function atStartOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function nthWeekOfMonth(date: Date) {
  return Math.ceil(date.getDate() / 7);
}

function matches(date: Date, input: RecurrenceInput) {
  const start = atStartOfDay(input.startsOn);
  const current = atStartOfDay(date);
  const days = Math.round((current.getTime() - start.getTime()) / 86400000);
  if (days < 0) return false;
  if (input.frequency === RecurrenceFrequency.DAILY) return days % input.interval === 0;
  if (input.frequency === RecurrenceFrequency.WEEKLY) {
    const weeks = Math.floor(days / 7);
    return weeks % input.interval === 0 && (input.weekDays?.length ? input.weekDays.includes(current.getDay()) : current.getDay() === start.getDay());
  }
  const months = (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();
  if (months < 0 || months % input.interval !== 0) return false;
  if (input.monthlyMode === "NTH_WEEKDAY") {
    return current.getDay() === (input.nthWeekday ?? start.getDay()) && nthWeekOfMonth(current) === (input.nthWeek ?? nthWeekOfMonth(start));
  }
  return current.getDate() === (input.monthDay ?? start.getDate());
}

function normalizeInput(input: RecurrenceInput) {
  const interval = Math.max(1, input.interval);
  const uniqueTrainerIds = Array.from(new Set(input.trainerIds.filter(Boolean)));
  if (uniqueTrainerIds.length === 0) throw new Error("Нужно выбрать хотя бы одного тренера");
  return {
    ...input,
    interval,
    trainerIds: uniqueTrainerIds,
    monthDay: input.monthlyMode === "DAY_OF_MONTH" ? (input.monthDay ?? input.startsOn.getDate()) : null,
    nthWeek: input.monthlyMode === "NTH_WEEKDAY" ? (input.nthWeek ?? nthWeekOfMonth(input.startsOn)) : null,
    nthWeekday: input.monthlyMode === "NTH_WEEKDAY" ? (input.nthWeekday ?? input.startsOn.getDay()) : null,
  };
}

async function createSeriesSessions(tx: Prisma.TransactionClient, ruleId: number, input: ReturnType<typeof normalizeInput>) {
  const limit = input.endsOn && input.endsOn < new Date(Date.now() + 120 * 86400000)
    ? input.endsOn : new Date(Date.now() + 120 * 86400000);
  const cursor = atStartOfDay(input.startsOn);
  while (cursor <= limit) {
    if (matches(cursor, input)) {
      const [hours, minutes] = input.startTime.split(":").map(Number);
      const date = new Date(cursor);
      date.setHours(hours, minutes, 0, 0);
      const existing = await tx.session.findFirst({ where: { recurringScheduleId: ruleId, date } });
      if (existing) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      await tx.session.create({
        data: {
          recurringScheduleId: ruleId,
          date,
          startTime: input.startTime,
          endTime: input.endTime || null,
          title: input.title || null,
          description: input.description || null,
          level: input.level,
          capacity: input.capacity,
          trainerId: input.trainerIds[0],
          trainerLinks: { create: input.trainerIds.map((trainerId) => ({ trainerId })) },
        },
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

export async function createRecurringSchedule(input: RecurrenceInput) {
  const normalized = normalizeInput(input);
  return prisma.$transaction(async (tx) => {
    const rule = await tx.recurringSchedule.create({
      data: {
        frequency: normalized.frequency,
        interval: normalized.interval,
        weekDays: normalized.weekDays?.join(",") || null,
        monthlyMode: normalized.monthlyMode || "DAY_OF_MONTH",
        monthDay: normalized.monthDay,
        nthWeek: normalized.nthWeek,
        nthWeekday: normalized.nthWeekday,
        startsOn: normalized.startsOn,
        endsOn: normalized.endsOn,
        startTime: normalized.startTime,
        endTime: normalized.endTime || null,
        title: normalized.title || null,
        description: normalized.description || null,
        level: normalized.level,
        capacity: normalized.capacity,
        trainerId: normalized.trainerIds[0],
        trainerLinks: { create: normalized.trainerIds.map((trainerId) => ({ trainerId })) },
      },
    });
    await createSeriesSessions(tx, rule.id, normalized);
    return rule;
  }, { timeout: 15000 });
}

export async function updateRecurringSchedule(ruleId: number, input: RecurrenceInput) {
  const normalized = normalizeInput(input);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const futureSessions = await tx.session.findMany({
      where: { recurringScheduleId: ruleId, date: { gte: now } },
      include: { bookings: { where: { status: { in: ["BOOKED", "PRESENT"] } }, select: { id: true } } },
    });
    const removableIds = futureSessions.filter((session) => session.bookings.length === 0).map((session) => session.id);
    if (removableIds.length) {
      await tx.sessionTrainer.deleteMany({ where: { sessionId: { in: removableIds } } });
      await tx.session.deleteMany({ where: { id: { in: removableIds } } });
    }
    await tx.recurringScheduleTrainer.deleteMany({ where: { recurringScheduleId: ruleId } });
    await tx.recurringSchedule.update({
      where: { id: ruleId },
      data: {
        frequency: normalized.frequency,
        interval: normalized.interval,
        weekDays: normalized.weekDays?.join(",") || null,
        monthlyMode: normalized.monthlyMode || "DAY_OF_MONTH",
        monthDay: normalized.monthDay,
        nthWeek: normalized.nthWeek,
        nthWeekday: normalized.nthWeekday,
        startsOn: normalized.startsOn,
        endsOn: normalized.endsOn,
        startTime: normalized.startTime,
        endTime: normalized.endTime || null,
        title: normalized.title || null,
        description: normalized.description || null,
        level: normalized.level,
        capacity: normalized.capacity,
        trainerId: normalized.trainerIds[0],
        trainerLinks: { create: normalized.trainerIds.map((trainerId) => ({ trainerId })) },
      },
    });
    await createSeriesSessions(tx, ruleId, normalized);
  }, { timeout: 15000 });
}
