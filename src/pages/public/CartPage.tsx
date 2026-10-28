import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Empty, Field } from '@/components/ui';
import { DeliveryForm, EMPTY_DELIVERY, validateDelivery } from '@/components/DeliveryForm';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { submitQuote } from '@/services/orders';
import { friendlyError } from '@/services/auth';
import { whatsappLink } from '@/config/site';
import type { DeliveryInfo } from '@/types';

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [delivery, setDelivery] = useState<DeliveryInfo>(EMPTY_DELIVERY);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!user) return nav('/entrar', { state: { from: '/carrinho' } });
    const e = validateDelivery(delivery);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!confirmed) return setError('Confirme que os dados estão corretos antes de enviar.');
    setBusy(true);
    try {
      const id = await submitQuote({ userId: user.uid, items, delivery: { ...delivery, state: 'RJ' }, notes });
      nav(`/painel/orcamentos/${id}`, { state: { created: true } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const summary = items.map((i) => `${i.quantity}× ${i.name} (${i.dimensionsLabel})`).join('; ');

  return (
    <div className="section">
      <div className="container">
        <h1>Carrinho</h1>
        {items.length === 0 ? (
          <Empty title="Seu carrinho está vazio"><Link className="btn" to="/comprar-paletes">Ver paletes</Link></Empty>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div className="stack">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produto</th><th>Dimensões</th><th>Quantidade</th><th /></tr></thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.productId}>
                        <td><strong>{i.name}</strong></td>
                        <td>{i.dimensionsLabel}</td>
                        <td>
                          <div className="qty">
                            <button aria-label="Diminuir" onClick={() => setQty(i.productId, i.quantity - 1)}>−</button>
                            <input aria-label={`Quantidade de ${i.name}`} type="number" min={1} value={i.quantity} onChange={(e) => setQty(i.productId, Number(e.target.value))} />
                            <button aria-label="Aumentar" onClick={() => setQty(i.productId, i.quantity + 1)}>+</button>
                          </div>
                        </td>
                        <td><button className="btn sm ghost" onClick={() => remove(i.productId)}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Alert kind="info">Os preços ainda não estão publicados. Sua solicitação será analisada pela equipe, que retornará com as condições comerciais, frete e prazo. Nenhum valor é confirmado automaticamente.</Alert>
            </div>

            <div className="card white">
              <h2>Destino da entrega</h2>
              <DeliveryForm value={delivery} onChange={setDelivery} errors={errors} />
              <Field label="Observações" htmlFor="obs">
                <textarea id="obs" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <h3>Resumo</h3>
              <p className="small">{summary}</p>
              <label className="checkbox" style={{ marginBottom: 12 }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                Confirmo que os produtos, quantidades e dados de entrega estão corretos.
              </label>
              {error && <Alert kind="error">{error}</Alert>}
              <div className="row">
                <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Enviando…' : user ? 'Enviar solicitação de orçamento' : 'Entrar para enviar'}</button>
                <a className="btn whats" target="_blank" rel="noopener noreferrer" href={whatsappLink(`Olá! Gostaria de um orçamento: ${summary}`)}>Falar no WhatsApp</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
