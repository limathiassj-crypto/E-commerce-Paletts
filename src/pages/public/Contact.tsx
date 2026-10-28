import { useState, type FormEvent } from 'react';
import { Alert, Field } from '@/components/ui';
import { SITE, whatsappLink } from '@/config/site';
import { useAuth } from '@/context/AuthContext';
import { sendContactMessage } from '@/services/misc';
import { friendlyError } from '@/services/auth';
import { isValidPhone, maskPhone } from '@/lib/normalize';

const REASONS = ['Compra de paletes', 'Venda de resíduos de madeira', 'Orçamentos', 'Entrega', 'Parcerias', 'Outros assuntos'];

export default function Contact() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ name: profile?.fullName ?? '', email: user?.email ?? '', phone: '', reason: REASONS[0], subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'E-mail inválido.';
    if (form.phone && !isValidPhone(form.phone)) er.phone = 'Telefone inválido.';
    if (form.subject.trim().length < 3) er.subject = 'Informe o assunto.';
    if (form.message.trim().length < 5) er.message = 'Escreva sua mensagem.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setState('sending');
    try {
      await sendContactMessage({ ...form, userId: user?.uid ?? null });
      setState('sent');
      setForm((f) => ({ ...f, subject: '', message: '' }));
    } catch (err) {
      setMsg(friendlyError(err));
      setState('error');
    }
  }

  return (
    <div className="section">
      <div className="container">
        <h1>Contato</h1>
        <div className="grid cols-2">
          <div className="card">
            <h2>WhatsApp</h2>
            <p>Atendimento comercial: <strong>{SITE.whatsapp.display}</strong></p>
            <a className="btn whats" href={whatsappLink()} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            <p className="small muted" style={{ marginTop: 16 }}>Sede: {SITE.headquarters}.</p>
          </div>
          <form className="card white" onSubmit={submit} noValidate>
            <h2>Envie uma mensagem</h2>
            {state === 'sent' && <Alert kind="ok">Mensagem registrada. Nossa equipe retornará pelo e-mail ou telefone informado.</Alert>}
            {state === 'error' && <Alert kind="error">Não foi possível enviar: {msg}</Alert>}
            <Field label="Nome" htmlFor="c-nome" error={errors.name}><input id="c-nome" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="E-mail" htmlFor="c-email" error={errors.email}><input id="c-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Telefone (opcional)" htmlFor="c-tel" error={errors.phone}><input id="c-tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} /></Field>
            <Field label="Motivo do contato" htmlFor="c-motivo">
              <select id="c-motivo" value={form.reason} onChange={(e) => set('reason', e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            </Field>
            <Field label="Assunto" htmlFor="c-assunto" error={errors.subject}><input id="c-assunto" value={form.subject} onChange={(e) => set('subject', e.target.value)} /></Field>
            <Field label="Mensagem" htmlFor="c-msg" error={errors.message}><textarea id="c-msg" value={form.message} maxLength={4000} onChange={(e) => set('message', e.target.value)} /></Field>
            <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar mensagem'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
