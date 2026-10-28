import { useEffect, useState, type ReactNode } from 'react';
import { QUOTE_STATUS_LABELS, RESIDUE_STATUS_LABELS, type QuoteStatus, type ResidueStatus } from '@/types';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <div className="spinner" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'ok' | 'error' | 'warn' | 'info'; children: ReactNode }) {
  return (
    <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

const OK = ['accepted', 'completed'];
const BAD = ['declined', 'cancelled'];
export function StatusBadge({ status, kind }: { status: QuoteStatus | ResidueStatus; kind: 'quote' | 'residue' }) {
  const label = kind === 'quote' ? QUOTE_STATUS_LABELS[status as QuoteStatus] : RESIDUE_STATUS_LABELS[status as ResidueStatus];
  const cls = OK.includes(status) ? 'ok' : BAD.includes(status) ? 'bad' : status === 'info_requested' ? 'warn' : '';
  return <span className={`badge ${cls}`}>{label ?? status}</span>;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn secondary" onClick={onCancel}>Voltar</button>
          <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function formatDate(ts: unknown): string {
  const t = ts as { toDate?: () => Date } | undefined;
  const d = t?.toDate?.();
  return d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

/** Hook de carregamento assíncrono com estados de erro e recarga. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError((e as { code?: string }).code === 'permission-denied' ? 'Sem permissão para ver estes dados.' : (e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, loading, error, reload: () => setTick((t) => t + 1), setData };
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(0), [items.length]);
  return { page, pages, setPage, slice: items.slice(page * pageSize, page * pageSize + pageSize) };
}

export function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn sm secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
      <span className="small">Página {page + 1} de {pages}</span>
      <button className="btn sm secondary" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próxima</button>
    </div>
  );
}
