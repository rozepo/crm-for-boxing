import Link from "next/link";
import { notFound } from "next/navigation";
import { logout, sellPass, updateClient } from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";

const levels = { BEGINNER: "Новичок", INTERMEDIATE: "Средний", ADVANCED: "Продвинутый" };

export default async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = sp.tab === "schedule" ? "schedule" : "profile";
  const client = await prisma.client.findUnique({
    where: { id: Number(id) },
    include: {
      passes: { orderBy: { purchasedAt: "desc" } },
      bookings: {
        include: {
          session: {
            include: {
              trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) notFound();

  const activePass = client.passes[0];

  return <main>
    <header className="topbar"><div><span className="eyebrow">КАРТОЧКА КЛИЕНТА</span><h1>{client.name}</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Люди</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>
    <Link href="/admin" className="backLink">← К базе</Link>
    <div className="detailShell">
      <section className="card detailPanel">
        <div className="sectionTitle"><div><p className="eyebrow">ПРОФИЛЬ</p><h2>Основные данные</h2></div><strong>{levels[client.level]}</strong></div>
        <div className="viewTabs"><Link className={tab === "profile" ? "active" : ""} href={`/admin/clients/${client.id}?tab=profile`}>Профиль</Link><Link className={tab === "schedule" ? "active" : ""} href={`/admin/clients/${client.id}?tab=schedule`}>Расписание</Link></div>
        {tab === "profile" ? <form action={updateClient} className="stack">
          <input type="hidden" name="clientId" value={client.id} />
          <label>Имя<input name="name" defaultValue={client.name} required /></label>
          <label>Телефон<input name="phone" defaultValue={client.phone} required /></label>
          <label>Уровень<select name="level" defaultValue={client.level}><option value="BEGINNER">Новичок</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутый</option></select></label>
          <label>Заметка<textarea name="note" rows={5} defaultValue={client.note ?? ""} placeholder="Цели, ограничения, особенности" /></label>
          <label className="check"><input type="checkbox" name="isFree" defaultChecked={client.isFree} /> Бесплатное место</label>
          <button className="primary">Сохранить карточку</button>
        </form> : <div className="stack">
          <div className="miniStats">
            <div><strong>{client.bookings.filter((b) => b.session.date >= new Date()).length}</strong><span>впереди</span></div>
            <div><strong>{client.bookings.length}</strong><span>всего записей</span></div>
            <div><strong>{client.isFree ? "∞" : activePass?.remaining ?? 0}</strong><span>остаток</span></div>
          </div>
          <div className="scheduleList compactList">{client.bookings.map((booking) => <Link className="scheduleRow card" href={`/admin/schedule/session/${booking.sessionId}`} key={booking.id}>
            <div className="calendarDate"><strong>{booking.session.date.getDate()}</strong><span>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(booking.session.date)}</span></div>
            <div><strong>{formatInterval(booking.session.startTime, booking.session.endTime)} · {booking.status}</strong><span>{booking.session.trainerLinks.map((link) => link.trainer.name).join(", ")}</span></div>
            <div className="capacity"><strong>{booking.session.level}</strong><span>уровень</span></div>
          </Link>)}</div>
        </div>}
      </section>

      <aside className="detailSidebar">
        <section className="card formCard">
          <h2>Абонементы</h2>
          <p>{client.isFree ? "Для бесплатного места баланс не считается." : `Текущий остаток: ${activePass?.remaining ?? 0}`}</p>
          <form action={sellPass} className="stack">
            <input type="hidden" name="clientId" value={client.id} />
            <label>Тип<select name="type"><option value="PACK">Пакет</option><option value="SINGLE">Разовое</option><option value="UNLIMITED">Безлимит, 30 дней</option></select></label>
            <label>Количество занятий<input type="number" name="remaining" defaultValue="8" min="1" /></label>
            <label>Цена, ₽<input type="number" name="priceRub" defaultValue="2800" min="0" /></label>
            <button className="primary">Добавить абонемент</button>
          </form>
        </section>
        <section className="card">
          <div className="sectionTitle"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Покупки</h2></div><strong>{client.passes.length}</strong></div>
          <div className="timelineList">{client.passes.map((pass) => <div className="timelineItem" key={pass.id}>
            <strong>{pass.type}</strong>
            <span>{pass.remaining ?? "∞"} занятий · {pass.priceRub} ₽</span>
          </div>)}</div>
        </section>
      </aside>
    </div>
  </main>;
}
