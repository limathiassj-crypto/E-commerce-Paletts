import { useMemo, useState } from 'react';
import { Alert, ConfirmModal, Empty, Field, Pager, Spinner, formatDate, useAsync, usePagination } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listCategories, saveCategory } from '@/services/catalog';
import {
  addMunicipality,
  listDeliveryMunicipalities,
  listResidueCollectionRegions,
  updateMunicipality,
} from '@/services/delivery';
import { getSettings, listAuditLogs, listUsers, loadAdminStats, saveSettings, setUserRole } from '@/services/misc';
import { friendlyError } from '@/services/auth';
import { REGION_LABELS, type RegionKey, type Role } from '@/types';

export function AdminStats() {
  const { data, loading, error } = useAsync(loadAdminStats, []);
  if (loading) return <Spinner />;
  if (error || !data) return <Alert kind="error">{error ?? 'Sem dados.'}</Alert>;
  const items: [string, number][] = [
    ['Total de clientes', data.users],
    ['Solicitações de orçamento abertas', data.openQuotes],
    ['Propostas em negociação', data.negotiating],
    ['Ofertas de resíduos recebidas', data.offers],
    ['Ofertas aguardando avaliação', data.offersWaiting],
    ['Produtos publicados', data.products],
    ['Pedidos concluídos', data.orders],
  ];
  return (
    <div className="stack">
      <h2>Indicadores</h2>
      <div className="grid cols-4">{items.map(([l, v]) => <div className="card" key={l}><div className="stat">{v}</div><p>{l}</p></div>)}</div>
    </div>
  );
}

export function AdminUsers() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(listUsers, []);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState<{ uid: string; name: string; role: Role; edit: boolean } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const rows = useMemo(() => (data ?? []).filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const pg = usePagination(rows, 12);

  async function apply() {
    if (!pending) return;
    try {
      await setUserRole(pending.uid, pending.role, pending.edit);
      setMsg({ kind: 'ok', text: 'Permissão atualizada. O usuário deve sair e entrar novamente para que passe a valer.' });
      reload();
    } catch (e) {
      setMsg({ kind: 'error', text: friendlyError(e) });
    }
    setPending(null);
  }

  return (
    <div className="stack">
      <h1>Usuários e permissões</h1>
      <p className="muted small">Funções são atribuídas pela Cloud Function segura <code>setUserRole</code>. Usuários não conseguem alterar a própria função.</p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Field label="Buscar" htmlFor="u-q"><input id="u-q" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Função atual</th><th>Cadastro</th><th>Alterar função</th></tr></thead>
            <tbody>{pg.slice.map((u) => (
              <tr key={u.uid}><td>{u.fullName}</td><td>{u.email}</td><td><span className="badge">{u.role ?? 'customer'}</span></td><td>{formatDate(u.createdAt)}</td>
                <td>{u.uid === user?.uid ? <span className="small muted">Você</span> : (
                  <div className="row">
                    <button className="btn sm secondary" onClick={() => setPending({ uid: u.uid, name: u.fullName, role: 'customer', edit: false })}>Cliente</button>
                    <button className="btn sm secondary" onClick={() => setPending({ uid: u.uid, name: u.fullName, role: 'seller', edit: false })}>Vendedor</button>
                    <button className="btn sm secondary" onClick={() => setPending({ uid: u.uid, name: u.fullName, role: 'seller', edit: true })}>Vendedor + produtos</button>
                    <button className="btn sm" onClick={() => setPending({ uid: u.uid, name: u.fullName, role: 'admin', edit: true })}>Administrador</button>
                  </div>
                )}</td></tr>
            ))}</tbody>
          </table></div>
          <Pager {...pg} />
        </>
      )}
      {pending && <ConfirmModal title="Alterar função?" message={`Definir ${pending.name} como "${pending.role}"${pending.role === 'seller' && pending.edit ? ' com permissão de editar produtos' : ''}. A alteração será registrada na auditoria.`} confirmLabel="Confirmar" onCancel={() => setPending(null)} onConfirm={apply} />}
    </div>
  );
}

export function AdminCategories() {
  const { data, loading, reload } = useAsync(listCategories, []);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Categorias</h1>
      {err && <Alert kind="error">{err}</Alert>}
      <form className="row" onSubmit={async (e) => { e.preventDefault(); if (name.trim().length < 2) return; try { await saveCategory({ name }); setName(''); setErr(''); reload(); } catch (x) { setErr(friendlyError(x)); } }}>
        <input aria-label="Nova categoria" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" />
        <button className="btn">Adicionar</button>
      </form>
      {loading ? <Spinner /> : <ul>{(data ?? []).map((c) => <li key={c.id}>{c.name}</li>)}</ul>}
    </div>
  );
}

function RegionsManager({ title, description, col, load }: { title: string; description: string; col: 'delivery_regions' | 'residue_collection_regions'; load: typeof listDeliveryMunicipalities }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(load, []);
  const [region, setRegion] = useState<'' | RegionKey>('');
  const [name, setName] = useState('');
  const [newRegion, setNewRegion] = useState<RegionKey>('serrana');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const rows = (data ?? []).filter((m) => !region || m.region === region);
  const pg = usePagination(rows, 15);

  async function run(fn: () => Promise<void>, ok: string) {
    try { await fn(); setMsg({ kind: 'ok', text: ok }); reload(); } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
  }

  return (
    <div className="stack">
      <h1>{title}</h1>
      <p className="muted small prose">{description}</p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card white">
        <h3>Adicionar município</h3>
        <div className="row">
          <input aria-label="Município" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome oficial do município" style={{ flex: 1, minWidth: 220 }} />
          <select aria-label="Região" value={newRegion} onChange={(e) => setNewRegion(e.target.value as RegionKey)} style={{ width: 'auto' }}>{Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn" onClick={() => name.trim().length >= 2 && run(async () => { await addMunicipality(col, name, newRegion, user!.uid); setName(''); }, 'Município adicionado.')}>Adicionar</button>
        </div>
      </div>
      <Field label="Filtrar por região" htmlFor="rg-f"><select id="rg-f" value={region} onChange={(e) => setRegion(e.target.value as '' | RegionKey)}><option value="">Todas</option>{Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty title="Nenhum município cadastrado" /> : (
        <>
          <p className="small muted">{rows.length} municípios · {rows.filter((r) => r.active).length} ativos</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Município</th><th>Região</th><th>Ativo</th><th>Última alteração</th><th /></tr></thead>
            <tbody>{pg.slice.map((m) => (
              <tr key={m.id}><td>{m.name}</td>
                <td><select aria-label={`Região de ${m.name}`} value={m.region} onChange={(e) => run(() => updateMunicipality(col, m.id, { region: e.target.value as RegionKey }, user!.uid), 'Região atualizada.')}>{Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td>{m.active ? 'Sim' : 'Não'}</td><td>{formatDate(m.updatedAt)}</td>
                <td><button className="btn sm secondary" onClick={() => run(() => updateMunicipality(col, m.id, { active: !m.active }, user!.uid), m.active ? 'Município desativado.' : 'Município ativado.')}>{m.active ? 'Desativar' : 'Ativar'}</button></td></tr>
            ))}</tbody>
          </table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}

export const AdminDeliveryRegions = () => (
  <RegionsManager title="Regiões de Entrega" col="delivery_regions" load={listDeliveryMunicipalities}
    description="Cobertura de entrega de paletes. A lista inicial é configuração comercial e pode ser corrigida pela empresa. Alterações ficam registradas na auditoria." />
);

export const AdminCollectionRegions = () => (
  <RegionsManager title="Cobertura de coleta de resíduos" col="residue_collection_regions" load={listResidueCollectionRegions}
    description="Configuração logística independente da entrega de paletes: defina os municípios de interesse para retirada ou recebimento de resíduos. Esta lista começa vazia e não herda a cobertura de entrega." />
);

export function AdminSettings() {
  const { data, loading, reload } = useAsync(() => getSettings('public'), []);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (loading) return <Spinner />;
  const f = form ?? { companyName: data?.companyName ?? '', headquarters: data?.headquarters ?? '', about: data?.about ?? '', collectionConditions: data?.collectionConditions ?? '' };
  const set = (k: string, v: string) => setForm({ ...f, [k]: v });
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Configurações institucionais</h1>
      <p className="muted small">O número de WhatsApp é configurado em um único arquivo do projeto (<code>src/config/site.ts</code>).</p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card white">
        <Field label="Nome da empresa" htmlFor="cf-n"><input id="cf-n" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
        <Field label="Sede" htmlFor="cf-h"><input id="cf-h" value={f.headquarters} onChange={(e) => set('headquarters', e.target.value)} /></Field>
        <Field label="Texto institucional" htmlFor="cf-a"><textarea id="cf-a" value={f.about} onChange={(e) => set('about', e.target.value)} /></Field>
        <Field label="Condições de retirada de resíduos" htmlFor="cf-c"><textarea id="cf-c" value={f.collectionConditions} onChange={(e) => set('collectionConditions', e.target.value)} /></Field>
        <button className="btn" onClick={async () => { try { await saveSettings('public', f); setMsg({ kind: 'ok', text: 'Configurações salvas.' }); setForm(null); reload(); } catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); } }}>Salvar</button>
      </div>
    </div>
  );
}

export function AdminAudit() {
  const { data, loading, error } = useAsync(listAuditLogs, []);
  const pg = usePagination(data ?? [], 15);
  return (
    <div className="stack">
      <h1>Histórico de auditoria</h1>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Spinner /> : (data ?? []).length === 0 ? <Empty title="Sem registros" /> : (
        <>
          <div className="table-wrap"><table><thead><tr><th>Data</th><th>Ação</th><th>Coleção</th><th>Documento</th><th>Responsável</th></tr></thead>
            <tbody>{pg.slice.map((l) => <tr key={l.id}><td>{formatDate(l.createdAt)}</td><td>{String(l.action)}</td><td>{String(l.collection)}</td><td>{String(l.documentId)}</td><td>{l.actorId ? String(l.actorId).slice(0, 8) : '—'}</td></tr>)}</tbody></table></div>
          <Pager {...pg} />
        </>
      )}
    </div>
  );
}
