import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Empty, Field, Pager, Spinner, StatusBadge, formatDate, useAsync, usePagination } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  createProposal,
  getHistory,
  getInternalNotes,
  getOffer,
  getQuote,
  listAllOrders,
  listAllProposals,
  listOffers,
  listQuotes,
  updateOfferByStaff,
  updateQuoteStatus,
} from '@/services/orders';
import { listAllProducts, saveProduct } from '@/services/catalog';
import { listCategories } from '@/services/catalog';
import { listContactMessages, listUsers, setContactStatus } from '@/services/misc';
import { friendlyError } from '@/services/auth';
import {
  QUOTE_STATUS_LABELS,
  REGION_LABELS,
  RESIDUE_STATUS_LABELS,
  type Quote,
  type QuoteStatus,
  type ResidueOffer,
  type ResidueStatus,
} from '@/types';

/** Filtro comum: data, status, município. */
function useFilters() {
  const [status, setStatus] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const inRange = (ts: unknown) => {
    const d = (ts as { toDate?: () => Date })?.toDate?.();
    if (!d) return true;
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(`${to}T23:59:59`)) return false;
    return true;
  };
  return { status, setStatus, municipality, setMunicipality, from, setFrom, to, setTo, inRange };
}

function FilterBar({ f, statuses }: { f: ReturnType<typeof useFilters>; statuses: Record<string, string> }) {
  return (
    <div className="card white form-grid">
      <Field label="Status" htmlFor="f-st"><select id="f-st" value={f.status} onChange={(e) => f.setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Município / cidade" htmlFor="f-mu"><input id="f-mu" value={f.municipality} onChange={(e) => f.setMunicipality(e.target.value)} /></Field>
      <Field label="De" htmlFor="f-de"><input id="f-de" type="date" value={f.from} onChange={(e) => f.setFrom(e.target.value)} /></Field>
      <Field label="Até" htmlFor="f-ate"><input id="f-ate" type="date" value={f.to} onChange={(e) => f.setTo(e.target.value)} /></Field>
    </div>
  );
}

export function StaffOverview() {
  const quotes = useAsync(() => listQuotes(), []);
  const offers = useAsync(() => listOffers(), []);
  if (quotes.loading || offers.loading) return <Spinner />;
  const q = quotes.data ?? [];
  const o = offers.data ?? [];
  return (
    <div className="stack">
      <h1>Visão geral</h1>
      <div className="grid cols-4">
        <div className="card"><div className="stat">{q.filter((x) => ['submitted', 'in_review', 'info_requested'].includes(x.status)).length}</div><p>Orçamentos abertos</p></div>
        <div className="card"><div className="stat">{q.filter((x) => ['in_negotiation', 'proposal_sent'].includes(x.status)).length}</div><p>Em negociação</p></div>
        <div className="card"><div className="stat">{o.filter((x) => ['submitted', 'in_review'].includes(x.status)).length}</div><p>Ofertas de resíduos aguardando avaliação</p></div>
        <div className="card"><div className="stat">{o.length}</div><p>Ofertas de resíduos recebidas</p></div>
      </div>
      <p><Link className="btn" to="/equipe/orcamentos">Orçamentos</Link> <Link className="btn secondary" to="/equipe/residuos">Resíduos</Link></p>
    </div>
  );
}

export function StaffQuotes() {
  const { data, loading, error } = useAsync(() => listQuotes(), []);
  const f = useFilters();
  const rows = useMemo(
    () => (data ?? []).filter((q) => (!f.status || q.status === f.status) && (!f.municipality || q.delivery.municipality.toLowerCase().includes(f.municipality.toLowerCase())) && f.inRange(q.createdAt)),
    [data, f.status, f.municipality, f.from, f.to],
  );
  const pg = usePagination(rows, 12);
  return (
    <div className="stack">
      <h1>Solicitações de orçamento</h1>
      <FilterBar f={f} statuses={QUOTE_STATUS_LABELS} />
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty title="Nenhuma solicitação encontrada" /> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Nº</th><th>Itens</th><th>Município</th><th>Cobertura</th><th>Status</th><th>Data</th><th /></tr></thead>
            <tbody>{pg.slice.map((q) => (
              <tr key={q.id}><td>#{q.id.slice(0, 6)}</td><td>{q.items.map((i) => `${i.quantity}× ${i.name} ${i.dimensionsLabel}`).join(', ')}</td><td>{q.delivery.municipality}</td>
                <td><span className={`badge ${q.deliveryCoverage === 'covered' ? 'ok' : 'warn'}`}>{q.deliveryCoverage === 'covered' ? 'Atendido' : 'Fora da lista'}</span></td>
                <td><StatusBadge status={q.status} kind="quote" /></td><td>{formatDate(q.createdAt)}</td><td><Link to={`/equipe/orcamentos/${q.id}`}>Abrir</Link></td></tr>
            ))}</tbody>
          </table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export function StaffQuoteDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: q, loading, error, reload } = useAsync(() => getQuote(id), [id]);
  const hist = useAsync(() => getHistory('quotes', id), [id]);
  const savedInternal = useAsync(() => getInternalNotes(id), [id]);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [note, setNote] = useState('');
  const [internal, setInternal] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [conditions, setConditions] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (loading) return <Spinner />;
  if (error || !q) return <Alert kind="error">{error ?? 'Não encontrado.'}</Alert>;

  async function applyStatus() {
    if (!status) return;
    try {
      await updateQuoteStatus(id, status, user!.uid, note, internal ?? undefined);
      setNote('');
      setMsg({ kind: 'ok', text: 'Status atualizado.' });
      reload();
      hist.reload();
    } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }
  async function saveInternal() {
    try { await updateQuoteStatus(id, q!.status, user!.uid, 'Observação interna atualizada', internal ?? ''); setMsg({ kind: 'ok', text: 'Observação interna salva.' }); reload(); hist.reload(); } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }
  async function sendProposal() {
    if (conditions.trim().length < 5) return setMsg({ kind: 'error', text: 'Descreva as condições da proposta.' });
    const value = amount.trim() === '' ? null : Number(amount.replace(',', '.'));
    if (value !== null && !(value >= 0)) return setMsg({ kind: 'error', text: 'Valor inválido.' });
    try {
      await createProposal({ quoteId: id, userId: q!.userId, kind: 'quote', amount: value, conditions }, user!.uid);
      await updateQuoteStatus(id, 'proposal_sent', user!.uid, 'Proposta comercial enviada ao cliente');
      setAmount(''); setConditions('');
      setMsg({ kind: 'ok', text: 'Proposta registrada e cliente notificado.' });
      reload(); hist.reload();
    } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }

  return (
    <div className="stack">
      <p className="small"><Link to="/equipe/orcamentos">← Solicitações</Link></p>
      <h1>Orçamento #{q.id.slice(0, 6)} <StatusBadge status={q.status} kind="quote" /></h1>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {q.deliveryCoverage !== 'covered' && <Alert kind="warn">Município fora da cobertura cadastrada. Não confirme frete, prazo ou transporte sem avaliação explícita.</Alert>}
      <div className="card white">
        <h3>Itens</h3>
        <ul>{q.items.map((i) => <li key={i.productId}>{i.quantity}× {i.name} — {i.dimensionsLabel}</li>)}</ul>
        <h3>Entrega</h3>
        <p>{q.delivery.address}, {q.delivery.neighborhood} — {q.delivery.municipality}/{q.delivery.state} — CEP {q.delivery.cep}</p>
        {q.notes && <p><strong>Obs. do cliente:</strong> {q.notes}</p>}
      </div>
      <div className="card white">
        <h3>Atualizar status</h3>
        <div className="form-grid">
          <Field label="Novo status" htmlFor="qs"><select id="qs" value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}><option value="">Selecione…</option>{Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Mensagem / informação adicional solicitada" htmlFor="qn"><input id="qn" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <button className="btn" disabled={!status} onClick={applyStatus}>Aplicar</button>
      </div>
      <div className="card white">
        <h3>Proposta comercial</h3>
        <div className="form-grid">
          <Field label="Valor total (R$) — opcional" htmlFor="pa"><input id="pa" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </div>
        <Field label="Condições (preço, frete, prazo, validade)" htmlFor="pc"><textarea id="pc" value={conditions} onChange={(e) => setConditions(e.target.value)} /></Field>
        <button className="btn" onClick={sendProposal}>Registrar e enviar proposta</button>
      </div>
      <div className="card white">
        <h3>Observações internas (não visíveis ao cliente)</h3>
        <textarea value={internal ?? savedInternal.data ?? ''} onChange={(e) => setInternal(e.target.value)} />
        <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={saveInternal}>Salvar observação</button>
      </div>
      <div className="card white">
        <h3>Histórico</h3>
        <ul className="timeline">{(hist.data ?? []).map((h) => <li key={h.id}><strong>{h.action.replace('status:', 'Status: ')}</strong> — {formatDate(h.createdAt)} <span className="small muted">({h.actorId === 'system' ? 'sistema' : h.actorId.slice(0, 6)})</span>{h.note && <div>{h.note}</div>}</li>)}</ul>
      </div>
    </div>
  );
}

export function StaffOffers() {
  const { data, loading, error } = useAsync(() => listOffers(), []);
  const f = useFilters();
  const rows = useMemo(
    () => (data ?? []).filter((o) => o.status !== 'draft' && (!f.status || o.status === f.status) && (!f.municipality || o.city.toLowerCase().includes(f.municipality.toLowerCase())) && f.inRange(o.createdAt)),
    [data, f.status, f.municipality, f.from, f.to],
  );
  const pg = usePagination(rows, 12);
  return (
    <div className="stack">
      <h1>Ofertas de resíduos</h1>
      <FilterBar f={f} statuses={RESIDUE_STATUS_LABELS} />
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty title="Nenhuma oferta encontrada" /> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Nº</th><th>Empresa</th><th>Material</th><th>Qtd.</th><th>Cidade</th><th>Status</th><th>Data</th><th /></tr></thead>
            <tbody>{pg.slice.map((o) => <tr key={o.id}><td>#{o.id.slice(0, 6)}</td><td>{o.companyName}</td><td>{o.material}</td><td>{o.approximateQuantity} {o.unit}</td><td>{o.city}/{o.state}</td><td><StatusBadge status={o.status} kind="residue" /></td><td>{formatDate(o.createdAt)}</td><td><Link to={`/equipe/residuos/${o.id}`}>Abrir</Link></td></tr>)}</tbody>
          </table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export function StaffOfferDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: o, loading, error, reload } = useAsync(() => getOffer(id), [id]);
  const hist = useAsync(() => getHistory('residue_offers', id), [id]);
  const [form, setForm] = useState<{ status: ResidueStatus | ''; evaluation: string; price: string; qty: string; transport: string; note: string } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (loading) return <Spinner />;
  if (error || !o) return <Alert kind="error">{error ?? 'Não encontrado.'}</Alert>;
  const f = form ?? { status: '' as ResidueStatus | '', evaluation: o.evaluation ?? '', price: o.proposedPrice?.toString() ?? '', qty: o.approvedQuantity?.toString() ?? '', transport: o.transportConditions ?? '', note: '' };

  async function save() {
    if (!f.status) return setMsg({ kind: 'error', text: 'Escolha o novo status.' });
    const price = f.price.trim() === '' ? undefined : Number(f.price.replace(',', '.'));
    const qty = f.qty.trim() === '' ? undefined : Number(f.qty.replace(',', '.'));
    if ((price !== undefined && !(price >= 0)) || (qty !== undefined && !(qty >= 0))) return setMsg({ kind: 'error', text: 'Preço e quantidade devem ser números válidos.' });
    try {
      await updateOfferByStaff(id, { status: f.status, evaluation: f.evaluation, proposedPrice: price, approvedQuantity: qty, transportConditions: f.transport }, user!.uid, f.note);
      if (f.status === 'proposal_sent') await createProposal({ offerId: id, userId: o!.userId, kind: 'residue', amount: price ?? null, conditions: f.transport || f.evaluation || 'Proposta de compra enviada.' }, user!.uid);
      setMsg({ kind: 'ok', text: 'Oferta atualizada.' });
      setForm(null); reload(); hist.reload();
    } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }
  const set = (patch: Partial<typeof f>) => setForm({ ...f, ...patch });

  return (
    <div className="stack">
      <p className="small"><Link to="/equipe/residuos">← Ofertas</Link></p>
      <h1>Oferta #{o.id.slice(0, 6)} <StatusBadge status={o.status} kind="residue" /></h1>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card white">
        <p><strong>{o.companyName}</strong> — {o.contactName} · {o.phone} · {o.email}{o.cnpj ? ` · CNPJ ${o.cnpj}` : ''}</p>
        <p><strong>{o.material}</strong> — {o.approximateQuantity} {o.unit} · {o.frequency} · {o.condition}</p>
        <p>{o.city}/{o.state} · Logística: {o.logisticsPreference}</p>
        {o.notes && <p>{o.notes}</p>}
        {o.photos.length > 0 && <div className="photos">{o.photos.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="Fotografia da oferta" loading="lazy" /></a>)}</div>}
      </div>
      <div className="card white">
        <h3>Avaliação e negociação</h3>
        <Alert kind="info">Compra e retirada só são confirmadas quando você define o status como “Aceito” ou “Aguardando retirada ou entrega”.</Alert>
        <div className="form-grid">
          <Field label="Novo status" htmlFor="os"><select id="os" value={f.status} onChange={(e) => set({ status: e.target.value as ResidueStatus })}><option value="">Selecione…</option>{Object.entries(RESIDUE_STATUS_LABELS).filter(([k]) => k !== 'draft').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Preço proposto (R$)" htmlFor="op"><input id="op" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} /></Field>
          <Field label={`Quantidade aprovada (${o.unit})`} htmlFor="oq"><input id="oq" inputMode="decimal" value={f.qty} onChange={(e) => set({ qty: e.target.value })} /></Field>
        </div>
        <Field label="Avaliação do material" htmlFor="oe"><textarea id="oe" value={f.evaluation} onChange={(e) => set({ evaluation: e.target.value })} /></Field>
        <Field label="Condições de transporte / retirada" htmlFor="ot"><textarea id="ot" value={f.transport} onChange={(e) => set({ transport: e.target.value })} /></Field>
        <Field label="Mensagem para o histórico (ex.: informação adicional solicitada)" htmlFor="on"><input id="on" value={f.note} onChange={(e) => set({ note: e.target.value })} /></Field>
        <button className="btn" onClick={save}>Salvar</button>
      </div>
      <div className="card white">
        <h3>Histórico</h3>
        <ul className="timeline">{(hist.data ?? []).map((h) => <li key={h.id}><strong>{h.action.replace('status:', 'Status: ')}</strong> — {formatDate(h.createdAt)}{h.note && <div>{h.note}</div>}</li>)}</ul>
      </div>
    </div>
  );
}

export function StaffOrders() {
  const { data, loading } = useAsync(listAllOrders, []);
  return (
    <div className="stack">
      <h1>Pedidos de paletes</h1>
      <p className="muted small">Pedidos são registrados pela equipe a partir de propostas aceitas. Nenhum pagamento é processado nesta versão.</p>
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Nenhum pedido registrado" /> : (
        <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>{(data ?? []).map((o) => <tr key={o.id}><td>#{o.id.slice(0, 6)}</td><td>{o.userId.slice(0, 6)}</td><td>{o.status}</td><td>{formatDate(o.createdAt)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export function StaffProposals() {
  const { data, loading } = useAsync(listAllProposals, []);
  return (
    <div className="stack">
      <h1>Propostas comerciais</h1>
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Nenhuma proposta registrada" /> : (
        <div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Referência</th><th>Valor</th><th>Condições</th><th>Data</th></tr></thead>
          <tbody>{(data ?? []).map((p) => <tr key={p.id}><td>{p.kind === 'quote' ? 'Venda de paletes' : 'Compra de resíduos'}</td><td><Link to={p.kind === 'quote' ? `/equipe/orcamentos/${p.quoteId}` : `/equipe/residuos/${p.offerId}`}>#{(p.quoteId ?? p.offerId ?? '').slice(0, 6)}</Link></td><td>{p.amount != null ? `R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td><td>{p.conditions}</td><td>{formatDate(p.createdAt)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export function StaffContacts() {
  const { data, loading, reload } = useAsync(listContactMessages, []);
  const pg = usePagination(data ?? [], 10);
  return (
    <div className="stack">
      <h1>Contatos recebidos</h1>
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Nenhuma mensagem recebida" /> : (
        <>
          {pg.slice.map((m) => (
            <div className="card white" key={m.id}>
              <div className="row between"><strong>{m.subject}</strong><span className={`badge ${m.status === 'new' ? 'warn' : 'ok'}`}>{m.status === 'new' ? 'Nova' : m.status === 'read' ? 'Lida' : 'Respondida'}</span></div>
              <p className="small muted">{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ''} · {m.reason} · {formatDate(m.createdAt)}</p>
              <p>{m.message}</p>
              <div className="row"><button className="btn sm secondary" onClick={async () => { await setContactStatus(m.id, 'read'); reload(); }}>Marcar como lida</button><button className="btn sm secondary" onClick={async () => { await setContactStatus(m.id, 'answered'); reload(); }}>Marcar como respondida</button></div>
            </div>
          ))}
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export function StaffClients() {
  const { data, loading, error } = useAsync(listUsers, []);
  const [q, setQ] = useState('');
  const rows = (data ?? []).filter((u) => `${u.fullName} ${u.email} ${u.companyName ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const pg = usePagination(rows, 12);
  return (
    <div className="stack">
      <h1>Clientes e fornecedores</h1>
      <Field label="Buscar" htmlFor="cl-q"><input id="cl-q" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : (
        <>
          <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Empresa</th><th>E-mail</th><th>Telefone</th><th>Tipo</th></tr></thead>
            <tbody>{pg.slice.map((u) => <tr key={u.uid}><td>{u.fullName}</td><td>{u.companyName || '—'}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.accountTypes?.map((t) => (t === 'customer' ? 'Cliente' : 'Fornecedor')).join(' / ')}</td></tr>)}</tbody></table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export function StaffReports() {
  const quotes = useAsync(() => listQuotes(), []);
  const offers = useAsync(() => listOffers(), []);
  if (quotes.loading || offers.loading) return <Spinner />;
  const count = <T extends { status: string }>(arr: T[]) => arr.reduce<Record<string, number>>((m, x) => ({ ...m, [x.status]: (m[x.status] ?? 0) + 1 }), {});
  const qc = count<Quote>(quotes.data ?? []);
  const oc = count<ResidueOffer>(offers.data ?? []);
  const byRegion: Record<string, number> = {};
  (quotes.data ?? []).forEach((q) => { const k = q.delivery.municipality; byRegion[k] = (byRegion[k] ?? 0) + 1; });
  const top = Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return (
    <div className="stack">
      <h1>Relatórios</h1>
      <p className="muted small">Contagens calculadas a partir dos registros reais. Valores financeiros só aparecem se forem registrados em propostas.</p>
      <div className="grid cols-2">
        <div className="card white"><h3>Orçamentos por status</h3>{Object.keys(qc).length === 0 ? <p className="muted small">Sem dados.</p> : <ul>{Object.entries(qc).map(([k, v]) => <li key={k}>{QUOTE_STATUS_LABELS[k as QuoteStatus] ?? k}: <strong>{v}</strong></li>)}</ul>}</div>
        <div className="card white"><h3>Ofertas de resíduos por status</h3>{Object.keys(oc).length === 0 ? <p className="muted small">Sem dados.</p> : <ul>{Object.entries(oc).map(([k, v]) => <li key={k}>{RESIDUE_STATUS_LABELS[k as ResidueStatus] ?? k}: <strong>{v}</strong></li>)}</ul>}</div>
        <div className="card white"><h3>Municípios com mais solicitações</h3>{top.length === 0 ? <p className="muted small">Sem dados.</p> : <ol>{top.map(([k, v]) => <li key={k}>{k}: <strong>{v}</strong></li>)}</ol>}</div>
      </div>
      <p className="small muted">Regiões comerciais: {Object.values(REGION_LABELS).join(' · ')}</p>
    </div>
  );
}

export function StaffProducts() {
  const { user, isAdmin, canEditProducts } = useAuth();
  const { data, loading, reload } = useAsync(listAllProducts, []);
  const cats = useAsync(listCategories, []);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', widthM: '1', lengthM: '1.2', description: '', price: '', stock: '', available: true, published: true });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!isAdmin && !canEditProducts) return <Alert kind="warn">Você não tem permissão para gerenciar produtos.</Alert>;

  function edit(p: NonNullable<typeof data>[number]) {
    setEditing(p.id);
    setForm({ name: p.name, categoryId: p.categoryId, widthM: String(p.widthM), lengthM: String(p.lengthM), description: p.description, price: p.price?.toString() ?? '', stock: p.stock?.toString() ?? '', available: p.available, published: p.published });
  }
  async function save() {
    const cat = (cats.data ?? []).find((c) => c.id === form.categoryId);
    const w = Number(form.widthM.replace(',', '.')); const l = Number(form.lengthM.replace(',', '.'));
    if (form.name.trim().length < 2 || !cat || !(w > 0) || !(l > 0)) return setMsg({ kind: 'error', text: 'Informe nome, categoria e dimensões válidas.' });
    try {
      await saveProduct({ id: editing && editing !== 'new' ? editing : undefined, name: form.name, categoryId: cat.id, categoryName: cat.name, widthM: w, lengthM: l, description: form.description, price: form.price.trim() === '' ? null : Number(form.price.replace(',', '.')), saleUnit: 'unidade', stock: form.stock.trim() === '' ? null : Number(form.stock), available: form.available, published: form.published, photos: (data ?? []).find((p) => p.id === editing)?.photos ?? [] }, user!.uid);
      setMsg({ kind: 'ok', text: 'Produto salvo.' }); setEditing(null); reload();
    } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }
  return (
    <div className="stack">
      <div className="row between"><h1>Produtos</h1><button className="btn" onClick={() => { setEditing('new'); setForm({ name: '', categoryId: '', widthM: '1', lengthM: '1.2', description: '', price: '', stock: '', available: true, published: false }); }}>Novo produto</button></div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {editing && (
        <div className="card white">
          <div className="form-grid">
            <Field label="Nome" htmlFor="pn"><input id="pn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Categoria" htmlFor="pc"><select id="pc" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Selecione…</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Largura (m)" htmlFor="pw"><input id="pw" value={form.widthM} onChange={(e) => setForm({ ...form, widthM: e.target.value })} /></Field>
            <Field label="Comprimento (m)" htmlFor="pl"><input id="pl" value={form.lengthM} onChange={(e) => setForm({ ...form, lengthM: e.target.value })} /></Field>
            <Field label="Preço (R$) — vazio = sob consulta" htmlFor="pp"><input id="pp" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Estoque — vazio = não controlado" htmlFor="ps"><input id="ps" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          </div>
          <Field label="Descrição técnica" htmlFor="pd"><textarea id="pd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="checkbox"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Disponível</label>
          <label className="checkbox" style={{ marginBottom: 12 }}><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publicado na loja</label>
          <div className="row"><button className="btn" onClick={save}>Salvar</button><button className="btn secondary" onClick={() => setEditing(null)}>Cancelar</button></div>
        </div>
      )}
      {loading ? <Spinner /> : (
        <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Dimensões</th><th>Categoria</th><th>Preço</th><th>Disponível</th><th>Publicado</th><th>Atualizado</th><th /></tr></thead>
          <tbody>{(data ?? []).map((p) => <tr key={p.id}><td>{p.name}<div className="small muted">{p.id}</div></td><td>{p.dimensionsLabel}</td><td>{p.categoryName}</td><td>{p.price != null ? `R$ ${p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sob consulta'}</td><td>{p.available ? 'Sim' : 'Não'}</td><td>{p.published ? 'Sim' : 'Não'}</td><td>{formatDate(p.updatedAt)}</td><td><button className="btn sm secondary" onClick={() => edit(p)}>Editar</button></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
