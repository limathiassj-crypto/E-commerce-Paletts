import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Alert, ConfirmModal, Empty, Field, Pager, Spinner, StatusBadge, formatDate, useAsync, usePagination } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  cancelMyOffer,
  cancelMyQuote,
  getHistory,
  getOffer,
  getQuote,
  listMyOffers,
  listMyOrders,
  listMyQuotes,
  listProposalsForUser,
} from '@/services/orders';
import { listNotifications, markAllRead, markNotificationRead } from '@/services/misc';
import { changePassword, friendlyError, updateProfile } from '@/services/auth';
import { isValidPhone, maskPhone } from '@/lib/normalize';
import type { AccountType } from '@/types';

export function Overview() {
  const { user, profile } = useAuth();
  const uid = user!.uid;
  const quotes = useAsync(() => listMyQuotes(uid), [uid]);
  const offers = useAsync(() => listMyOffers(uid), [uid]);
  const orders = useAsync(() => listMyOrders(uid), [uid]);
  const notes = useAsync(() => listNotifications(uid), [uid]);

  if (quotes.loading || offers.loading) return <Spinner />;
  const q = quotes.data ?? [];
  const o = offers.data ?? [];
  const pendingQuotes = q.filter((x) => ['submitted', 'in_review', 'info_requested', 'in_negotiation', 'proposal_sent'].includes(x.status)).length;
  const inProgressOrders = (orders.data ?? []).filter((x) => x.status !== 'completed' && x.status !== 'cancelled').length;
  const offersInReview = o.filter((x) => ['submitted', 'in_review', 'info_requested', 'in_negotiation'].includes(x.status)).length;

  return (
    <div className="stack">
      <h1>Olá{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}</h1>
      <div className="grid cols-4">
        <div className="card"><div className="stat">{pendingQuotes}</div><p>Orçamentos pendentes</p></div>
        <div className="card"><div className="stat">{inProgressOrders}</div><p>Pedidos em andamento</p></div>
        <div className="card"><div className="stat">{offersInReview}</div><p>Ofertas de resíduos em análise</p></div>
        <div className="card"><div className="stat">{(notes.data ?? []).filter((n) => !n.read).length}</div><p>Notificações novas</p></div>
      </div>
      <div className="grid cols-2">
        <div className="card white">
          <h3>Solicitações recentes</h3>
          {q.length === 0 ? <p className="muted small">Nenhuma solicitação ainda. <Link to="/comprar-paletes">Ver paletes</Link></p> : (
            <ul style={{ paddingLeft: 18 }}>{q.slice(0, 4).map((x) => <li key={x.id}><Link to={`/painel/orcamentos/${x.id}`}>#{x.id.slice(0, 6)}</Link> — <StatusBadge status={x.status} kind="quote" /></li>)}</ul>
          )}
        </div>
        <div className="card white">
          <h3>Atualizações recentes</h3>
          {(notes.data ?? []).length === 0 ? <p className="muted small">Sem atualizações.</p> : (
            <ul style={{ paddingLeft: 18 }}>{(notes.data ?? []).slice(0, 4).map((n) => <li key={n.id}>{n.title} <span className="small muted">({formatDate(n.createdAt)})</span></li>)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyQuotes() {
  const { user } = useAuth();
  const { data, loading, error } = useAsync(() => listMyQuotes(user!.uid), [user!.uid]);
  const pg = usePagination(data ?? [], 10);
  return (
    <div className="stack">
      <h1>Meus Orçamentos</h1>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Você ainda não solicitou orçamentos"><Link className="btn" to="/comprar-paletes">Solicitar orçamento</Link></Empty> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Nº</th><th>Itens</th><th>Município</th><th>Status</th><th>Data</th><th /></tr></thead>
            <tbody>{pg.slice.map((q) => (
              <tr key={q.id}><td>#{q.id.slice(0, 6)}</td><td>{q.items.map((i) => `${i.quantity}× ${i.name} ${i.dimensionsLabel}`).join(', ')}</td><td>{q.delivery.municipality}</td><td><StatusBadge status={q.status} kind="quote" /></td><td>{formatDate(q.createdAt)}</td><td><Link to={`/painel/orcamentos/${q.id}`}>Abrir</Link></td></tr>
            ))}</tbody>
          </table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export function QuoteDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const loc = useLocation();
  const { data: q, loading, error, reload } = useAsync(() => getQuote(id), [id]);
  const hist = useAsync(() => getHistory('quotes', id), [id]);
  const props = useAsync(() => listProposalsForUser(user!.uid), [user!.uid]);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  if (loading) return <Spinner />;
  if (error || !q) return <Alert kind="error">{error ?? 'Orçamento não encontrado.'}</Alert>;
  const mine = (props.data ?? []).filter((p) => p.quoteId === id);
  const canCancel = ['submitted', 'in_review', 'info_requested'].includes(q.status);

  return (
    <div className="stack">
      <p className="small"><Link to="/painel/orcamentos">← Meus orçamentos</Link></p>
      <h1>Orçamento #{q.id.slice(0, 6)} <StatusBadge status={q.status} kind="quote" /></h1>
      {(loc.state as { created?: boolean } | null)?.created && <Alert kind="ok">Solicitação registrada. Nossa equipe irá analisar e retornar com as condições comerciais.</Alert>}
      {q.deliveryCoverage === 'not_covered' && <Alert kind="warn">Município fora da cobertura cadastrada. A equipe avaliará a possibilidade de atendimento; nada foi confirmado.</Alert>}
      {err && <Alert kind="error">{err}</Alert>}
      <div className="card white">
        <h3>Itens</h3>
        <ul>{q.items.map((i) => <li key={i.productId}>{i.quantity}× {i.name} — {i.dimensionsLabel}</li>)}</ul>
        <h3>Entrega</h3>
        <p>{q.delivery.address}, {q.delivery.neighborhood} — {q.delivery.municipality}/{q.delivery.state} — CEP {q.delivery.cep}</p>
        {q.notes && (<><h3>Observações</h3><p>{q.notes}</p></>)}
      </div>
      <div className="card white">
        <h3>Propostas</h3>
        {mine.length === 0 ? <p className="muted small">Nenhuma proposta ainda.</p> : mine.map((p) => (
          <div key={p.id}><strong>{p.amount != null ? `R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor a definir'}</strong><p>{p.conditions}</p></div>
        ))}
      </div>
      <div className="card white">
        <h3>Histórico</h3>
        {(hist.data ?? []).length === 0 ? <p className="muted small">Sem registros.</p> : (
          <ul className="timeline">{(hist.data ?? []).map((h) => <li key={h.id}><strong>{h.action.replace('status:', 'Status: ')}</strong> — {formatDate(h.createdAt)}{h.note && <div>{h.note}</div>}</li>)}</ul>
        )}
      </div>
      {canCancel && <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirm(true)}>Cancelar solicitação</button>}
      {confirm && (
        <ConfirmModal title="Cancelar solicitação?" message="Esta ação não pode ser desfeita." confirmLabel="Cancelar solicitação" onCancel={() => setConfirm(false)}
          onConfirm={async () => { try { await cancelMyQuote(id); setConfirm(false); reload(); hist.reload(); } catch (e) { setErr(friendlyError(e)); setConfirm(false); } }} />
      )}
    </div>
  );
}

export function MyOrders() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => listMyOrders(user!.uid), [user!.uid]);
  return (
    <div className="stack">
      <h1>Meus Pedidos</h1>
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Nenhum pedido ainda">Pedidos são gerados pela equipe a partir de propostas aceitas.</Empty> : (
        <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>{(data ?? []).map((o) => <tr key={o.id}><td>#{o.id.slice(0, 6)}</td><td>{o.status}</td><td>{formatDate(o.createdAt)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export function MyOffers() {
  const { user } = useAuth();
  const { data, loading, error } = useAsync(() => listMyOffers(user!.uid), [user!.uid]);
  return (
    <div className="stack">
      <div className="row between"><h1>Minhas Ofertas de Resíduos</h1><Link className="btn" to="/painel/residuos/nova">Nova oferta</Link></div>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Você ainda não enviou ofertas" /> : (
        <div className="table-wrap"><table><thead><tr><th>Nº</th><th>Material</th><th>Quantidade</th><th>Status</th><th>Data</th><th /></tr></thead>
          <tbody>{(data ?? []).map((o) => <tr key={o.id}><td>#{o.id.slice(0, 6)}</td><td>{o.material}</td><td>{o.approximateQuantity} {o.unit}</td><td><StatusBadge status={o.status} kind="residue" /></td><td>{formatDate(o.createdAt)}</td><td><Link to={`/painel/residuos/${o.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export function OfferDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const loc = useLocation();
  const { data: o, loading, error, reload } = useAsync(() => getOffer(id), [id]);
  const hist = useAsync(() => getHistory('residue_offers', id), [id]);
  const props = useAsync(() => listProposalsForUser(user!.uid), [user!.uid]);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');
  if (loading) return <Spinner />;
  if (error || !o) return <Alert kind="error">{error ?? 'Oferta não encontrada.'}</Alert>;
  const mine = (props.data ?? []).filter((p) => p.offerId === id);
  const canCancel = ['draft', 'submitted', 'info_requested'].includes(o.status);
  return (
    <div className="stack">
      <p className="small"><Link to="/painel/residuos">← Minhas ofertas</Link></p>
      <h1>Oferta #{o.id.slice(0, 6)} <StatusBadge status={o.status} kind="residue" /></h1>
      {(loc.state as { created?: boolean } | null)?.created && <Alert kind="ok">Oferta registrada. Ela será avaliada pela equipe; nenhuma compra ou retirada está confirmada.</Alert>}
      {err && <Alert kind="error">{err}</Alert>}
      <div className="card white">
        <p><strong>{o.material}</strong> — {o.approximateQuantity} {o.unit} · {o.frequency} · {o.condition}</p>
        <p>{o.city}/{o.state} · Logística: {o.logisticsPreference}</p>
        {o.notes && <p>{o.notes}</p>}
        {o.photos.length > 0 && <div className="photos">{o.photos.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="Fotografia do material" loading="lazy" /></a>)}</div>}
      </div>
      <div className="card white">
        <h3>Avaliação e proposta</h3>
        {o.evaluation && <p>{o.evaluation}</p>}
        {o.proposedPrice != null && <p><strong>Preço proposto:</strong> R$ {o.proposedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
        {o.approvedQuantity != null && <p><strong>Quantidade aprovada:</strong> {o.approvedQuantity} {o.unit}</p>}
        {o.transportConditions && <p><strong>Transporte:</strong> {o.transportConditions}</p>}
        {mine.map((p) => <p key={p.id}>{p.conditions}</p>)}
        {!o.evaluation && o.proposedPrice == null && mine.length === 0 && <p className="muted small">Aguardando avaliação da equipe.</p>}
      </div>
      <div className="card white">
        <h3>Histórico</h3>
        {(hist.data ?? []).length === 0 ? <p className="muted small">Sem registros.</p> : <ul className="timeline">{(hist.data ?? []).map((h) => <li key={h.id}><strong>{h.action.replace('status:', 'Status: ')}</strong> — {formatDate(h.createdAt)}{h.note && <div>{h.note}</div>}</li>)}</ul>}
      </div>
      {canCancel && <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirm(true)}>Cancelar oferta</button>}
      {confirm && <ConfirmModal title="Cancelar oferta?" message="Esta ação não pode ser desfeita." confirmLabel="Cancelar oferta" onCancel={() => setConfirm(false)}
        onConfirm={async () => { try { await cancelMyOffer(id); setConfirm(false); reload(); hist.reload(); } catch (e) { setErr(friendlyError(e)); setConfirm(false); } }} />}
    </div>
  );
}

export function Notifications() {
  const { user } = useAuth();
  const { data, loading, reload } = useAsync(() => listNotifications(user!.uid), [user!.uid]);
  return (
    <div className="stack">
      <div className="row between"><h1>Notificações</h1>{(data ?? []).some((n) => !n.read) && <button className="btn secondary sm" onClick={async () => { await markAllRead(data ?? []); reload(); }}>Marcar todas como lidas</button>}</div>
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Nenhuma notificação" /> : (
        <div className="stack">{(data ?? []).map((n) => (
          <div key={n.id} className="card white" style={{ opacity: n.read ? 0.7 : 1 }}>
            <div className="row between"><strong>{n.title}</strong><span className="small muted">{formatDate(n.createdAt)}</span></div>
            <p>{n.body}</p>
            <div className="row">
              {n.link && <Link to={n.link} onClick={() => !n.read && markNotificationRead(n.id)}>Abrir</Link>}
              {!n.read && <button className="btn sm ghost" onClick={async () => { await markNotificationRead(n.id); reload(); }}>Marcar como lida</button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

export function Profile() {
  const { user, profile } = useAuth();
  const [f, setF] = useState({ fullName: profile?.fullName ?? '', phone: profile?.phone ?? '', companyName: profile?.companyName ?? '' });
  const [types, setTypes] = useState<AccountType[]>(profile?.accountTypes ?? ['customer']);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.fullName.trim().length < 2 || !isValidPhone(f.phone) || types.length === 0) return setMsg({ kind: 'error', text: 'Verifique nome, telefone e tipo de conta.' });
    try { await updateProfile(user!.uid, { ...f, accountTypes: types }); setMsg({ kind: 'ok', text: 'Perfil atualizado.' }); } catch (err) { setMsg({ kind: 'error', text: friendlyError(err) }); }
  }
  const toggle = (t: AccountType) => setTypes((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Meu Perfil</h1>
      <form className="card white" onSubmit={submit}>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <Field label="E-mail" htmlFor="p-mail"><input id="p-mail" value={user?.email ?? ''} disabled /></Field>
        <Field label="Nome completo" htmlFor="p-nome"><input id="p-nome" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Telefone" htmlFor="p-tel"><input id="p-tel" value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} /></Field>
        <Field label="Empresa" htmlFor="p-emp"><input id="p-emp" value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></Field>
        <label className="checkbox"><input type="checkbox" checked={types.includes('customer')} onChange={() => toggle('customer')} /> Cliente (comprar paletes)</label>
        <label className="checkbox" style={{ marginBottom: 14 }}><input type="checkbox" checked={types.includes('supplier')} onChange={() => toggle('supplier')} /> Fornecedor de resíduos</label>
        <button className="btn">Salvar</button>
      </form>
      <p className="small muted">Para solicitar acesso, correção ou exclusão dos seus dados (LGPD), use a página de <Link to="/contato">Contato</Link>.</p>
    </div>
  );
}

export function Security() {
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setMsg({ kind: 'error', text: 'A nova senha precisa ter ao menos 8 caracteres.' });
    try { await changePassword(user!, cur, next); setMsg({ kind: 'ok', text: 'Senha alterada.' }); setCur(''); setNext(''); } catch (err) { setMsg({ kind: 'error', text: friendlyError(err) }); }
  }
  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <h1>Segurança</h1>
      <p>E-mail verificado: <strong>{user?.emailVerified ? 'sim' : 'não'}</strong></p>
      <form className="card white" onSubmit={submit}>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <Field label="Senha atual" htmlFor="s-cur"><input id="s-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="Nova senha" htmlFor="s-new"><input id="s-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <button className="btn">Alterar senha</button>
      </form>
    </div>
  );
}
