import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="loginPage"><section className="loginCard"><div className="glove">🥊</div><p className="eyebrow">УГОЛ · STAFF</p><h1>Вход для команды</h1><p>Введите PIN администратора или тренера.</p><form action={login}><label>PIN-код<input name="pin" type="password" inputMode="numeric" autoFocus placeholder="••••" required /></label>{error && <span className="error">Неверный PIN-код</span>}<button className="primary wide">Войти в журнал</button></form><small>Демо-доступ: 1234</small></section></main>;
}
