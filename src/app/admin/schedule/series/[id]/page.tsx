import Link from "next/link";
import { notFound } from "next/navigation";
import { logout, updateRecurringSeriesAction } from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";

const levels = { BEGINNER: "Новички", INTERMEDIATE: "Средний", ADVANCED: "Продвинутые" };
const weekdays = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]] as const;

function dateField(value: Date | null) {
  if (!value) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default async function SeriesDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [rule, trainers] = await Promise.all([
    prisma.recurringSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } },
        sessions: {
          where: { date: { gte: new Date() } },
          include: { _count: { select: { bookings: true } } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          take: 12,
        },
      },
    }),
    prisma.trainer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!rule) notFound();

  const selectedWeekdays = new Set((rule.weekDays || "").split(",").filter(Boolean).map(Number));

  return <main>
    <header className="topbar"><div><span className="eyebrow">СЕРИЯ ЗАНЯТИЙ</span><h1>{rule.title || levels[rule.level]}</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Люди</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>
    <Link href="/admin/schedule" className="backLink">← К расписанию</Link>
    <div className="detailShell">
      <section className="card detailPanel">
        <div className="sectionTitle"><div><p className="eyebrow">ПРАВИЛО</p><h2>Редактирование серии</h2></div><strong>{rule.sessions.length} впереди</strong></div>
        <form action={updateRecurringSeriesAction} className="stack">
          <input type="hidden" name="ruleId" value={rule.id} />
          <label>Название<input name="title" defaultValue={rule.title ?? ""} placeholder="Например, Утренний спарринг" /></label>
          <label>Описание<textarea name="description" rows={4} defaultValue={rule.description ?? ""} placeholder="Что важно для всей серии" /></label>
          <div className="formPair"><label>Начало<input type="date" name="startsOn" defaultValue={dateField(rule.startsOn)} required /></label><label>До даты<input type="date" name="endsOn" defaultValue={dateField(rule.endsOn)} /></label></div>
          <div className="formPair"><label>Повторять<select name="frequency" defaultValue={rule.frequency}><option value="WEEKLY">По неделям</option><option value="DAILY">По дням</option><option value="MONTHLY">По месяцам</option></select></label><label>Каждые<input type="number" name="interval" defaultValue={rule.interval} min="1" max="12" required /></label></div>
          <fieldset><legend>Дни недели</legend><div className="weekdayChecks">{weekdays.map(([value, label]) => <label key={value}><input type="checkbox" name="weekDays" value={value} defaultChecked={selectedWeekdays.has(value)} /><span>{label}</span></label>)}</div></fieldset>
          <div className="formPair"><label>Начало<input type="time" name="startTime" defaultValue={rule.startTime} required /></label><label>Конец<input type="time" name="endTime" defaultValue={rule.endTime ?? ""} /></label></div>
          <div className="formPair"><label>Мест<input type="number" name="capacity" defaultValue={rule.capacity} min="1" max="50" required /></label><label>Уровень<select name="level" defaultValue={rule.level}><option value="BEGINNER">Новички</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутые</option></select></label></div>
          <fieldset><legend>Режим месяца</legend><div className="radioGrid">
            <label className="radioCard"><input type="radio" name="monthlyMode" value="DAY_OF_MONTH" defaultChecked={(rule.monthlyMode || "DAY_OF_MONTH") === "DAY_OF_MONTH"} /><span>По числу месяца</span></label>
            <label className="radioCard"><input type="radio" name="monthlyMode" value="NTH_WEEKDAY" defaultChecked={rule.monthlyMode === "NTH_WEEKDAY"} /><span>По позиции дня недели</span></label>
          </div></fieldset>
          <div className="formPair"><label>Число месяца<input type="number" name="monthDay" min="1" max="31" defaultValue={rule.monthDay ?? rule.startsOn.getDate()} /></label><label>Неделя месяца<select name="nthWeek" defaultValue={String(rule.nthWeek ?? Math.ceil(rule.startsOn.getDate() / 7))}><option value="1">1-я</option><option value="2">2-я</option><option value="3">3-я</option><option value="4">4-я</option><option value="5">5-я</option></select></label></div>
          <label>День недели для месяца<select name="nthWeekday" defaultValue={String(rule.nthWeekday ?? rule.startsOn.getDay())}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <fieldset><legend>Тренеры</legend><div className="trainerChecks">{trainers.map((trainer) => <label key={trainer.id} className="trainerChip"><input type="checkbox" name="trainerIds" value={trainer.id} defaultChecked={rule.trainerLinks.some((link) => link.trainerId === trainer.id)} /><span>{trainer.name}</span></label>)}</div></fieldset>
          <button className="primary">Сохранить серию и пересобрать будущие слоты</button>
          <p className="formHint">Занятия в будущем без записей пересобираются. Слоты с уже записанными клиентами сохраняются как исключения.</p>
        </form>
      </section>

      <aside className="detailSidebar">
        <section className="card">
          <div className="sectionTitle"><div><p className="eyebrow">БЛИЖАЙШЕЕ</p><h2>Будущие слоты</h2></div><strong>{rule.sessions.length}</strong></div>
          <div className="scheduleList compactList">{rule.sessions.map((session) => <Link className="scheduleRow card" href={`/admin/schedule/session/${session.id}`} key={session.id}>
            <div className="calendarDate"><strong>{session.date.getDate()}</strong><span>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(session.date)}</span></div>
            <div><strong>{session.title || levels[session.level]}</strong><span>{formatInterval(session.startTime, session.endTime)}</span></div>
            <div className="capacity"><strong>{session._count.bookings}</strong><span>записано</span></div>
          </Link>)}</div>
        </section>
      </aside>
    </div>
  </main>;
}
