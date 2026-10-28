import { useEffect, useState } from 'react';
import { Alert, Field } from '@/components/ui';
import { isValidCep, maskCep } from '@/lib/normalize';
import { checkDeliveryCoverage, type CoverageResult } from '@/services/delivery';
import type { DeliveryInfo } from '@/types';

export const EMPTY_DELIVERY: DeliveryInfo = { cep: '', municipality: '', state: 'RJ', neighborhood: '', address: '' };

export function validateDelivery(d: DeliveryInfo): Record<string, string> {
  const e: Record<string, string> = {};
  if (!isValidCep(d.cep)) e.cep = 'Informe um CEP válido (00000-000).';
  if (d.municipality.trim().length < 2) e.municipality = 'Informe o município.';
  if (d.state.trim().toUpperCase() !== 'RJ') e.state = 'Atendemos apenas solicitações do estado do Rio de Janeiro (RJ).';
  if (d.neighborhood.trim().length < 2) e.neighborhood = 'Informe o bairro.';
  if ((d.address ?? '').trim().length < 5) e.address = 'Informe o endereço completo.';
  return e;
}

export function DeliveryForm({
  value,
  onChange,
  errors = {},
  onCoverage,
}: {
  value: DeliveryInfo;
  onChange: (v: DeliveryInfo) => void;
  errors?: Record<string, string>;
  onCoverage?: (r: CoverageResult | null) => void;
}) {
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);
  const [checking, setChecking] = useState(false);
  const set = (patch: Partial<DeliveryInfo>) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (value.municipality.trim().length < 3) {
      setCoverage(null);
      onCoverage?.(null);
      return;
    }
    let alive = true;
    setChecking(true);
    const t = setTimeout(() => {
      checkDeliveryCoverage(value.municipality, value.state)
        .then((r) => {
          if (alive) {
            setCoverage(r);
            onCoverage?.(r);
          }
        })
        .catch(() => alive && setCoverage(null))
        .finally(() => alive && setChecking(false));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.municipality, value.state]);

  return (
    <div>
      <div className="form-grid">
        <Field label="CEP" htmlFor="cep" error={errors.cep}>
          <input id="cep" inputMode="numeric" value={value.cep} onChange={(e) => set({ cep: maskCep(e.target.value) })} placeholder="00000-000" autoComplete="postal-code" />
        </Field>
        <Field label="Município" htmlFor="mun" error={errors.municipality}>
          <input id="mun" value={value.municipality} onChange={(e) => set({ municipality: e.target.value })} autoComplete="address-level2" />
        </Field>
        <Field label="Estado" htmlFor="uf" error={errors.state}>
          <input id="uf" value={value.state} maxLength={2} onChange={(e) => set({ state: e.target.value.toUpperCase() })} autoComplete="address-level1" />
        </Field>
        <Field label="Bairro" htmlFor="bairro" error={errors.neighborhood}>
          <input id="bairro" value={value.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} />
        </Field>
      </div>
      <Field label="Endereço completo" htmlFor="end" error={errors.address}>
        <input id="end" value={value.address ?? ''} onChange={(e) => set({ address: e.target.value })} placeholder="Rua, número, complemento" autoComplete="street-address" />
      </Field>
      {checking && <p className="small muted">Verificando cobertura…</p>}
      {!checking && coverage && <Alert kind={coverage.covered ? 'ok' : 'warn'}>{coverage.message}</Alert>}
    </div>
  );
}
