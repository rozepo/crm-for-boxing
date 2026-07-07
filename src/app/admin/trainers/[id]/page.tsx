import Link from "next/link";
import { notFound } from "next/navigation";
import { logout, updateTrainer } from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";

const levels = { BEGINNER: "Новички", INTERMEDIATE: "Средний", ADVANCED: "Продвинутые" };
const frequencyText = { DAILY: "каждый N-й день", WEEKLY: "по неделям", MONTHLY: "по месяцам" };

export default async function TrainerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = sp.tab === "series" ? "series" : sp.tab === "schedule" ? "schedule" : "profile";
  const trainer = await prisma.trainer.findUnique({
    where: { id: Number(id) },
    include: {
      sessionLinks: {
        include: { session: { include: { trainerLinks: { include: { trainer: true } }, _count: { select: { bookings: true } } } } },
        orderBy: { session: { date: "asc" } },
      },
      recurringLinks: {
        include: { recurringSchedule: true },
        orderBy: { recurringSchedule: { createdAt: "desc" } },
      },
    },
  });
  if (!trainer) notFound();

  return <main>
    <header className="topbar"><div><span className="eyebrow">КАРТОЧКА ТРЕНЕРА</span><h1>{trainer.name}</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Люди</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>
    <Link href="/admin" className="backLink">← К базе</Link>
    <div className="detailShell">
      <section className="card detailPanel">
        <div className="sectionTitle"><div><p className="eyebrow">ПРОФИЛЬ</p><h2>Управление тренером</h2></div><strong>{trainer.sessionLinks.length} слотов</strong></div>
        <div className="viewTabs"><Link className={tab === "profile" ? "active" : ""} href={`/admin/trainers/${trainer.id}?tab=profile`}>Профиль</Link><Link className={tab === "schedule" ? "active" : ""} href={`/admin/trainers/${trainer.id}?tab=schedule`}>Слоты</Link><Link className={tab === "series" ? "active" : ""} href={`/admin/trainers/${trainer.id}?tab=series`}>Серии</Link></div>
        {tab === "profile" ? <form action={updateTrainer} className="stack">
          <input type="hidden" name="trainerId" value={trainer.id} />
          <label>Имя<input name="name" defaultValue={trainer.name} required /></label>
          <label>Телефон<input name="phone" defaultValue={trainer.phone ?? ""} /></label>
          <label>Описание<textarea name="bio" rows={6} defaultValue={trainer.bio ?? ""} placeholder="Специализация, график, ограничения" /></label>
          <button className="primary">Сохранить тренера</button>
        </form> : null}
        {tab === "schedule" ? <div className="scheduleList compactList">{trainer.sessionLinks.map((link) => <Link className="scheduleRow card" href={`/admin/schedule/session/${link.session.id}`} key={`${link.sessionId}-${link.trainerId}`}>
          <div className="calendarDate"><strong>{link.session.date.getDate()}</strong><span>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(link.session.date)}</span></div>
          <div><strong>{link.session.title || levels[link.session.level]} · {formatInterval(link.session.startTime, link.session.endTime)}</strong><span>{link.session.trainerLinks.map((trainerLink) => trainerLink.trainer.name).join(", ")}</span></div>
          <div className="capacity"><strong>{link.session._count.bookings}</strong><span>записано</span></div>
        </Link>)}</div> : null}
        {tab === "series" ? <div className="timelineList">{trainer.recurringLinks.map((link) => <Link className="timelineItem clickable" href={`/admin/schedule/series/${link.recurringScheduleId}`} key={`${link.recurringScheduleId}-${link.trainerId}`}>
          <strong>{link.recurringSchedule.title || levels[link.recurringSchedule.level]}</strong>
          <span>{formatInterval(link.recurringSchedule.startTime, link.recurringSchedule.endTime)} · {frequencyText[link.recurringSchedule.frequency]}</span>
        </Link>)}</div> : null}
      </section>

      <aside className="detailSidebar">
        <section className="card">
          <div className="sectionTitle"><div><p className="eyebrow">СВОДКА</p><h2>Нагрузка</h2></div><strong>{trainer.recurringLinks.length}</strong></div>
          <div className="miniStats">
            <div><strong>{trainer.sessionLinks.filter((link) => link.session.date >= new Date()).length}</strong><span>впереди</span></div>
            <div><strong>{trainer.recurringLinks.length}</strong><span>активных серий</span></div>
            <div><strong>{trainer.phone ? "ok" : "—"}</strong><span>контакт</span></div>
          </div>
        </section>
      </aside>
    </div>
  </main>;
}
