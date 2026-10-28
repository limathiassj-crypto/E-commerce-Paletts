import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, login, resetPassword, signUp } from '@/services/auth';
import { isValidPhone, maskPhone } from '@/lib/normalize';
import type { AccountType } from '@/types';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card white">
          <h1 style={{ fontSize: '1.7rem' }}>{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { user, isStaff } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from ?? (isStaff ? '/equipe' : '/painel')} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav(from ?? '/painel', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Entrar">
      <form onSubmit={submit}>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="E-mail" htmlFor="l-mail"><input id="l-mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Senha" htmlFor="l-pass"><input id="l-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="small" style={{ marginTop: 16 }}>
        <Link to="/recuperar-senha">Esqueci minha senha</Link> · <Link to="/criar-conta">Criar conta</Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', companyName: '', password: '', confirm: '' });
  const [types, setTypes] = useState<AccountType[]>(['customer']);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  if (user) return <Navigate to="/painel" replace />;

  const toggle = (t: AccountType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.fullName.trim().split(/\s+/).length < 2) er.fullName = 'Informe o nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'E-mail inválido.';
    if (!isValidPhone(f.phone)) er.phone = 'Telefone inválido.';
    if (f.password.length < 8) er.password = 'Mínimo de 8 caracteres.';
    if (f.password !== f.confirm) er.confirm = 'As senhas não coincidem.';
    if (types.length === 0) er.types = 'Selecione ao menos um tipo de conta.';
    if (!terms) er.terms = 'É necessário aceitar os termos e a política de privacidade.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError('');
    try {
      await signUp({ fullName: f.fullName, email: f.email.trim(), password: f.password, phone: f.phone, companyName: f.companyName, accountTypes: types });
      nav('/painel', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Criar conta">
      <form onSubmit={submit} noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Nome completo" htmlFor="r-nome" error={errors.fullName}><input id="r-nome" autoComplete="name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <Field label="E-mail" htmlFor="r-mail" error={errors.email}><input id="r-mail" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Telefone" htmlFor="r-tel" error={errors.phone}><input id="r-tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} /></Field>
        <Field label="Nome da empresa" htmlFor="r-emp"><input id="r-emp" autoComplete="organization" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
          <legend style={{ fontWeight: 650, fontSize: '0.9rem', marginBottom: 6 }}>Tipo de conta</legend>
          <label className="checkbox"><input type="checkbox" checked={types.includes('customer')} onChange={() => toggle('customer')} /> Cliente (comprar paletes)</label>
          <label className="checkbox"><input type="checkbox" checked={types.includes('supplier')} onChange={() => toggle('supplier')} /> Fornecedor de resíduos (oferecer materiais)</label>
          <span className="hint small">Uma mesma conta pode comprar paletes e oferecer resíduos.</span>
          {errors.types && <div className="err small" style={{ color: 'var(--erro)' }}>{errors.types}</div>}
        </fieldset>
        <Field label="Senha" htmlFor="r-pass" error={errors.password} hint="Mínimo de 8 caracteres."><input id="r-pass" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Confirmar senha" htmlFor="r-conf" error={errors.confirm}><input id="r-conf" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} /></Field>
        <label className="checkbox" style={{ marginBottom: 6 }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>Li e aceito os <Link to="/termos" target="_blank">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
        </label>
        {errors.terms && <p className="small" style={{ color: 'var(--erro)' }}>{errors.terms}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Criando conta…' : 'Criar conta'}</button>
      </form>
      <p className="small" style={{ marginTop: 16 }}>Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Recuperar senha">
      {sent ? (
        <Alert kind="ok">Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.</Alert>
      ) : (
        <form onSubmit={submit}>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="E-mail da conta" htmlFor="f-mail"><input id="f-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
        </form>
      )}
      <p className="small" style={{ marginTop: 16 }}><Link to="/entrar">Voltar para entrar</Link></p>
    </Shell>
  );
}
