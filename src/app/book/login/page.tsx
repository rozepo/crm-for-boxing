import Link from "next/link";
import { clientLogin } from "@/app/actions";

export default async function ClientLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="clientShell loginPage"><section className="loginCard clientLogin"><div className="brandMark">У</div><p className="eyebrow">СЕКЦИЯ БОКСА «УГОЛ»</p><h1>Запись на тренировку</h1><p>Введите телефон, который оставляли администратору.</p><form action={clientLogin}><label>Номер телефона<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 123-45-67" required /></label>{error && <span className="error">Номер не найден. Обратитесь к администратору.</span>}<button className="primary wide">Продолжить</button></form><Link className="staffLink" href="/login">Вход для команды</Link></section></main>;
}
