import Link from "next/link";
import { createRecurringSessions, createSession, logout } from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";

const levels = { BEGINNER: "Новички", INTERMEDIATE: "Средний", ADVANCED: "Продвинутые" };
const frequencies = { DAILY: "дни", WEEKLY: "недели", MONTHLY: "месяцы" };
const weekLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const weekdays = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]] as const;

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

type SearchParams = {
  view?: string;
  week?: string;
  month?: string;
  from?: string;
  to?: string;
  trainer?: string;
  level?: string;
  start?: string;
  q?: string;
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const sp = await searchParams;
  const view = sp.view === "month" || sp.view === "list" ? sp.view : "week";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAnchor = sp.week ? new Date(`${sp.week}T00:00:00`) : today;
  const weekStart = startOfWeek(weekAnchor);
  const monthAnchor = sp.month ? new Date(`${sp.month}-01T00:00:00`) : today;
  const monthYear = monthAnchor.getFullYear();
  const monthIndex = monthAnchor.getMonth();

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "month") {
    rangeStart = new Date(monthYear, monthIndex, 1);
    rangeEnd = new Date(monthYear, monthIndex + 1, 1);
  } else if (view === "list") {
    rangeStart = sp.from ? new Date(`${sp.from}T00:00:00`) : today;
    rangeEnd = sp.to ? new Date(`${sp.to}T23:59:59`) : addDays(today, 120);
  } else {
    rangeStart = weekStart;
    rangeEnd = addDays(weekStart, 7);
  }

  const trainerFilter = Number(sp.trainer || 0) || null;
  const startFilter = sp.start || "";
  const query = (sp.q || "").trim().toLowerCase();
  const levelFilter = sp.level === "BEGINNER" || sp.level === "INTERMEDIATE" || sp.level === "ADVANCED" ? sp.level : "";

  const [trainers, sessionsRaw, rules] = await Promise.all([
    prisma.trainer.findMany({ orderBy: { name: "asc" } }),
    prisma.session.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      include: {
        trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } },
        _count: { select: { bookings: { where: { status: { in: ["BOOKED", "PRESENT"] } } } } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: view === "list" ? 80 : 500,
    }),
    prisma.recurringSchedule.findMany({
      where: { active: true },
      include: { trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } }, sessions: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sessions = sessionsRaw.filter((session) => {
    if (trainerFilter && !session.trainerLinks.some((link) => link.trainerId === trainerFilter)) return false;
    if (levelFilter && session.level !== levelFilter) return false;
    if (startFilter && session.startTime < startFilter) return false;
    if (!query) return true;
    const haystack = `${session.title || ""} ${session.description || ""} ${session.trainerLinks.map((link) => link.trainer.name).join(" ")} ${levels[session.level]}`.toLowerCase();
    return haystack.includes(query);
  });

  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(monthAnchor);
  const shortMonth = new Intl.DateTimeFormat("ru-RU", { month: "short" });
  const selectedFrom = sp.from || iso(today);
  const selectedTo = sp.to || iso(addDays(today, 30));

  const withParams = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...next, view };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/admin/schedule?${params.toString()}`;
  };

  return <main>
    <header className="topbar"><div><span className="eyebrow">СЕКЦИЯ БОКСА</span><h1>Расписание</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Люди</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>

    <div className="scheduleLayout">
      <aside className="scheduleForms">
        <details className="card formCard" open>
          <summary>Разовая тренировка</summary>
          <form action={createSession} className="stack">
            <label>Название<input name="title" placeholder="Например, техника + лапы" /></label>
            <label>Дата<input type="date" name="date" required /></label>
            <div className="formPair"><label>Начало<input type="time" name="startTime" defaultValue="18:00" required /></label><label>Конец<input type="time" name="endTime" defaultValue="20:00" /></label></div>
            <div className="formPair"><label>Мест<input type="number" name="capacity" defaultValue="12" min="1" max="50" required /></label><label>Уровень<select name="level"><option value="BEGINNER">Новички</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутые</option></select></label></div>
            <fieldset><legend>Тренеры</legend><div className="trainerChecks">{trainers.map((trainer) => <label key={trainer.id} className="trainerChip"><input type="checkbox" name="trainerIds" value={trainer.id} /><span>{trainer.name}</span></label>)}</div></fieldset>
            <label>Описание<textarea name="description" rows={3} placeholder="Что будет на занятии" /></label>
            <button className="primary">Добавить один раз</button>
          </form>
        </details>

        <details className="card formCard">
          <summary>Повторяющиеся занятия</summary>
          <form action={createRecurringSessions} className="stack">
            <label>Название<input name="title" placeholder="Например, вечерняя группа" /></label>
            <label>Описание<textarea name="description" rows={3} placeholder="Общие правила для серии" /></label>
            <div className="formPair"><label>Начало<input type="date" name="startsOn" required /></label><label>До даты<input type="date" name="endsOn" /></label></div>
            <div className="formPair"><label>Повторять<select name="frequency"><option value="WEEKLY">По неделям</option><option value="DAILY">По дням</option><option value="MONTHLY">По месяцам</option></select></label><label>Каждые<input type="number" name="interval" defaultValue="1" min="1" max="12" required /></label></div>
            <fieldset><legend>Дни недели</legend><div className="weekdayChecks">{weekdays.map(([value, label]) => <label key={value}><input type="checkbox" name="weekDays" value={value} /><span>{label}</span></label>)}</div></fieldset>
            <fieldset><legend>Месячное условие</legend><div className="radioGrid">
              <label className="radioCard"><input type="radio" name="monthlyMode" value="DAY_OF_MONTH" defaultChecked /><span>По числу месяца</span></label>
              <label className="radioCard"><input type="radio" name="monthlyMode" value="NTH_WEEKDAY" /><span>По позиции дня недели</span></label>
            </div></fieldset>
            <div className="formPair"><label>Число месяца<input type="number" name="monthDay" min="1" max="31" defaultValue="1" /></label><label>Неделя месяца<select name="nthWeek" defaultValue="1"><option value="1">1-я</option><option value="2">2-я</option><option value="3">3-я</option><option value="4">4-я</option><option value="5">5-я</option></select></label></div>
            <label>День недели для месяца<select name="nthWeekday" defaultValue="1">{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="formPair"><label>Начало<input type="time" name="startTime" defaultValue="18:00" required /></label><label>Конец<input type="time" name="endTime" defaultValue="20:00" /></label></div>
            <div className="formPair"><label>Мест<input type="number" name="capacity" defaultValue="12" min="1" max="50" required /></label><label>Уровень<select name="level"><option value="BEGINNER">Новички</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутые</option></select></label></div>
            <fieldset><legend>Тренеры</legend><div className="trainerChecks">{trainers.map((trainer) => <label key={trainer.id} className="trainerChip"><input type="checkbox" name="trainerIds" value={trainer.id} /><span>{trainer.name}</span></label>)}</div></fieldset>
            <button className="primary">Создать серию</button>
          </form>
        </details>

        {rules.length > 0 && <section className="rules card">
          <div className="sectionTitle"><div><p className="eyebrow">АКТИВНЫЕ СЕРИИ</p><h2>Правила повторений</h2></div><strong>{rules.length}</strong></div>
          {rules.map((rule) => <Link className="ruleLink" href={`/admin/schedule/series/${rule.id}`} key={rule.id}>
            <strong>{rule.title || levels[rule.level]}</strong>
            <span>Каждые {rule.interval} {frequencies[rule.frequency]} · {rule.trainerLinks.map((link) => link.trainer.name).join(", ")}</span>
          </Link>)}
        </section>}
      </aside>

      <section className="scheduleMain">
        <div className="toolbar card">
          <div className="viewTabs">
            <Link className={view === "week" ? "active" : ""} href={withParams({ view: "week" })}>Неделя</Link>
            <Link className={view === "month" ? "active" : ""} href={withParams({ view: "month" })}>Месяц</Link>
            <Link className={view === "list" ? "active" : ""} href={withParams({ view: "list" })}>Список</Link>
          </div>
          <form className="filterGrid" method="get">
            <input type="hidden" name="view" value={view} />
            <label>От<input type="date" name="from" defaultValue={selectedFrom} /></label>
            <label>До<input type="date" name="to" defaultValue={selectedTo} /></label>
            <label>С<select name="start" defaultValue={startFilter}><option value="">любого времени</option><option value="07:00">с 07:00</option><option value="12:00">с 12:00</option><option value="18:00">с 18:00</option></select></label>
            <label>Уровень<select name="level" defaultValue={levelFilter}><option value="">все</option><option value="BEGINNER">Новички</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутые</option></select></label>
            <label>Тренер<select name="trainer" defaultValue={sp.trainer || ""}><option value="">все</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label>
            <label>Поиск<input name="q" defaultValue={sp.q || ""} placeholder="название, заметка, тренер" /></label>
            <button className="ghost">Фильтровать</button>
          </form>
        </div>

        {view === "week" && (() => {
          const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
          const rangeLabel = `${weekStart.getDate()} ${shortMonth.format(weekStart)} — ${addDays(weekStart, 6).getDate()} ${shortMonth.format(addDays(weekStart, 6))}`;
          return <>
            <div className="viewNav"><Link className="navArrow" href={withParams({ week: iso(addDays(weekStart, -7)) })}>‹</Link><strong>{rangeLabel}</strong><Link className="navArrow" href={withParams({ week: iso(addDays(weekStart, 7)) })}>›</Link></div>
            <div className="weekGrid">{days.map((day) => {
              const daySessions = sessions.filter((session) => iso(session.date) === iso(day));
              return <div className={`weekCol${iso(day) === iso(today) ? " today" : ""}`} key={iso(day)}>
                <div className="weekColHead"><span>{weekLabels[(day.getDay() + 6) % 7]}</span><strong>{day.getDate()}</strong></div>
                <div className="weekColBody">{daySessions.length === 0 ? <span className="weekEmpty">—</span> : daySessions.map((session) => <Link className={`weekEvent ${session.level.toLowerCase()}${session.status !== "SCHEDULED" ? " done" : ""}`} href={`/admin/schedule/session/${session.id}`} key={session.id}>
                  <strong>{formatInterval(session.startTime, session.endTime)}</strong>
                  <span>{session.title || levels[session.level]}</span>
                  <small>{session.trainerLinks.map((link) => link.trainer.name).join(", ")}</small>
                </Link>)}</div>
              </div>;
            })}</div>
          </>;
        })()}

        {view === "month" && (() => {
          const countDays = new Date(monthYear, monthIndex + 1, 0).getDate();
          const leading = (new Date(monthYear, monthIndex, 1).getDay() + 6) % 7;
          const cells = Array.from({ length: leading + countDays }, (_, index) => (index < leading ? null : index - leading + 1));
          const previousMonth = `${monthIndex === 0 ? monthYear - 1 : monthYear}-${String(monthIndex === 0 ? 12 : monthIndex).padStart(2, "0")}`;
          const nextMonth = `${monthIndex === 11 ? monthYear + 1 : monthYear}-${String(monthIndex === 11 ? 1 : monthIndex + 2).padStart(2, "0")}`;
          return <>
            <div className="viewNav"><Link className="navArrow" href={withParams({ month: previousMonth })}>‹</Link><strong style={{ textTransform: "capitalize" }}>{monthLabel}</strong><Link className="navArrow" href={withParams({ month: nextMonth })}>›</Link></div>
            <div className="card calendar">
              <div className="weekHead">{weekLabels.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="monthGrid">{cells.map((day, index) => {
                const daySessions = day ? sessions.filter((session) => session.date.getDate() === day) : [];
                return <div className={`dayCell ${!day ? "blank" : ""}`} key={index}>{day && <><strong>{day}</strong>{daySessions.slice(0, 4).map((session) => <Link className={`eventDot ${session.level.toLowerCase()}`} href={`/admin/schedule/session/${session.id}`} key={session.id}>{session.startTime} {session.title || levels[session.level]}</Link>)}{daySessions.length > 4 && <span className="moreDot">+{daySessions.length - 4}</span>}</>}</div>;
              })}</div>
            </div>
          </>;
        })()}

        {view === "list" && <>
          <div className="mobileSectionTitle"><h2>Предстоящие</h2><span>{sessions.length}</span></div>
          <div className="scheduleList">{sessions.map((session) => <Link className="scheduleRow card" href={`/admin/schedule/session/${session.id}`} key={session.id}>
            <div className="calendarDate"><strong>{session.date.getDate()}</strong><span>{shortMonth.format(session.date)}</span></div>
            <div><strong>{formatInterval(session.startTime, session.endTime)} · {session.title || levels[session.level]}</strong><span>{session.trainerLinks.map((link) => link.trainer.name).join(", ")}{session.recurringScheduleId ? " · серия" : " · разовая"}{session.status !== "SCHEDULED" ? " · закрыта" : ""}</span></div>
            <div className="capacity"><strong>{session._count.bookings}/{session.capacity}</strong><span>записано</span></div>
          </Link>)}</div>
          {sessions.length === 0 ? <p className="empty">Ничего не найдено по выбранным фильтрам.</p> : null}
        </>}
      </section>
    </div>
  </main>;
}
