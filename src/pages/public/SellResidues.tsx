import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { submitResidueOffer, validatePhotos, MAX_PHOTOS } from '@/services/orders';
import { friendlyError } from '@/services/auth';
import { isValidPhone, maskPhone } from '@/lib/normalize';

export const MATERIALS = [
  'Paletes PBR usados',
  'Paletes descartáveis usados',
  'Paletes danificados',
  'Sobras de madeira',
  'Resíduos industriais de madeira',
  'Outros materiais de madeira para avaliação',
];
const UNITS = ['unidades', 'toneladas', 'kg', 'm³', 'cargas de caminhão'];
const FREQ = ['Pontual (única vez)', 'Semanal', 'Quinzenal', 'Mensal', 'Outra frequência'];
const CONDITIONS = ['Bom estado', 'Estado regular', 'Danificado', 'Misto / varia'];
const LOGISTICS = ['Preciso de retirada pela Multicaixas', 'Posso entregar na Multicaixas', 'A combinar'];

export function SellResidues() {
  const { user } = useAuth();
  return (
    <div className="section">
      <div className="container">
        <h1>Sua empresa tem paletes usados ou resíduos de madeira?</h1>
        <p className="muted prose">A Multicaixas compra resíduos de madeira e paletes descartados por empresas para avaliação e possível reaproveitamento.</p>
        <p className="prose">A madeira adequada é transformada em novos produtos, conforme suas características e os processos produtivos disponíveis. Cada oferta passa por avaliação: <strong>não aceitamos todos os materiais automaticamente</strong> e nenhuma compra ou retirada é confirmada sem aprovação comercial.</p>
        <h2>Materiais que avaliamos</h2>
        <div className="grid cols-3">
          {MATERIALS.map((m) => <div key={m} className="card"><h3 style={{ margin: 0 }}>{m}</h3></div>)}
        </div>
        <div className="row" style={{ marginTop: 28 }}>
          {user ? <Link className="btn lg" to="/painel/residuos/nova">OFERECER RESÍDUOS</Link> : (
            <>
              <Link className="btn lg" to="/entrar" state={{ from: '/painel/residuos/nova' }}>Entrar para oferecer</Link>
              <Link className="btn lg secondary" to="/criar-conta">Criar conta de fornecedor</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewResidueOffer() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    contactName: profile?.fullName ?? '',
    companyName: profile?.companyName ?? '',
    cnpj: '',
    phone: profile?.phone ?? '',
    email: user?.email ?? '',
    city: '',
    state: 'RJ',
    material: MATERIALS[0],
    approximateQuantity: '',
    unit: UNITS[0],
    frequency: FREQ[0],
    condition: CONDITIONS[0],
    logisticsPreference: LOGISTICS[2],
    notes: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function pick(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const err = validatePhotos(next);
    if (err) return setError(err);
    setError('');
    setFiles(next);
  }

  async function submit(e: FormEvent, asDraft = false) {
    e.preventDefault();
    if (!user) return;
    const er: Record<string, string> = {};
    if (f.contactName.trim().length < 2) er.contactName = 'Informe o responsável.';
    if (f.companyName.trim().length < 2) er.companyName = 'Informe a empresa.';
    if (f.cnpj && f.cnpj.replace(/\D/g, '').length !== 14) er.cnpj = 'CNPJ deve ter 14 dígitos.';
    if (!isValidPhone(f.phone)) er.phone = 'Telefone inválido.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'E-mail inválido.';
    if (f.city.trim().length < 2) er.city = 'Informe a cidade.';
    if (!(Number(f.approximateQuantity) > 0)) er.approximateQuantity = 'Informe uma quantidade aproximada.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError('');
    try {
      const id = await submitResidueOffer({
        userId: user.uid,
        files,
        asDraft,
        data: { ...f, approximateQuantity: Number(f.approximateQuantity) },
      });
      nav(`/painel/residuos/${id}`, { state: { created: true } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Oferecer resíduos de madeira</h1>
      <Alert kind="info">Sua oferta será avaliada pela equipe. Nenhuma compra ou retirada é confirmada automaticamente.</Alert>
      <form className="card white" onSubmit={(e) => submit(e)} noValidate>
        <div className="form-grid">
          <Field label="Nome do responsável" htmlFor="o-nome" error={errors.contactName}><input id="o-nome" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
          <Field label="Nome da empresa" htmlFor="o-emp" error={errors.companyName}><input id="o-emp" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
          <Field label="CNPJ (opcional)" htmlFor="o-cnpj" error={errors.cnpj}><input id="o-cnpj" inputMode="numeric" value={f.cnpj} onChange={(e) => set('cnpj', e.target.value)} /></Field>
          <Field label="Telefone" htmlFor="o-tel" error={errors.phone}><input id="o-tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} /></Field>
          <Field label="E-mail" htmlFor="o-mail" error={errors.email}><input id="o-mail" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Cidade" htmlFor="o-cid" error={errors.city}><input id="o-cid" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Estado" htmlFor="o-uf"><input id="o-uf" maxLength={2} value={f.state} onChange={(e) => set('state', e.target.value.toUpperCase())} /></Field>
          <Field label="Tipo de material" htmlFor="o-mat"><select id="o-mat" value={f.material} onChange={(e) => set('material', e.target.value)}>{MATERIALS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Quantidade aproximada" htmlFor="o-qtd" error={errors.approximateQuantity}><input id="o-qtd" type="number" min={0} step="any" value={f.approximateQuantity} onChange={(e) => set('approximateQuantity', e.target.value)} /></Field>
          <Field label="Unidade de medida" htmlFor="o-un"><select id="o-un" value={f.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Frequência de geração" htmlFor="o-fr"><select id="o-fr" value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>{FREQ.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Estado geral do material" htmlFor="o-cond"><select id="o-cond" value={f.condition} onChange={(e) => set('condition', e.target.value)}>{CONDITIONS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Preferência logística" htmlFor="o-log"><select id="o-log" value={f.logisticsPreference} onChange={(e) => set('logisticsPreference', e.target.value)}>{LOGISTICS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label={`Fotografias (até ${MAX_PHOTOS}, JPG/PNG/WebP, máx. 5 MB cada)`} htmlFor="o-fotos">
          <input id="o-fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => pick(e.target.files)} />
        </Field>
        {files.length > 0 && (
          <ul className="small">
            {files.map((file, i) => (
              <li key={file.name + i}>{file.name} <button type="button" className="btn sm ghost" onClick={() => setFiles(files.filter((_, j) => j !== i))}>remover</button></li>
            ))}
          </ul>
        )}
        <Field label="Observações adicionais" htmlFor="o-obs"><textarea id="o-obs" value={f.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} /></Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar oferta'}</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={(e) => submit(e as unknown as FormEvent, true)}>Salvar rascunho</button>
        </div>
      </form>
    </div>
  );
}
