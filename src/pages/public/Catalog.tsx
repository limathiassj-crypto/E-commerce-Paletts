import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Empty, Spinner, useAsync, usePagination, Pager } from '@/components/ui';
import { getProduct, listCategories, listPublishedProducts } from '@/services/catalog';
import { useCart } from '@/context/CartContext';
import { normalizeName } from '@/lib/normalize';
import type { Product } from '@/types';

export function ProductPhoto({ product }: { product: Product }) {
  const photo = product.photos?.[0];
  return (
    <div className="product-photo">
      {photo ? <img src={photo} alt={`${product.name} ${product.dimensionsLabel}`} loading="lazy" /> : null}
      {!photo && <span className="tag">Imagem ilustrativa — foto real em breve</span>}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <article className="card product-card">
      <ProductPhoto product={product} />
      <div>
        <h3 style={{ marginBottom: 2 }}>{product.name}</h3>
        <div className="dim">{product.dimensionsLabel}</div>
        <span className="small muted">{product.categoryName}</span>
      </div>
      <div className="row" style={{ marginTop: 'auto' }}>
        <Link className="btn secondary sm" to={`/produto/${product.id}`}>Ver detalhes</Link>
        <button
          className="btn sm"
          disabled={!product.available}
          onClick={() => {
            add(product, 1);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
        >
          {!product.available ? 'Indisponível' : added ? 'Adicionado ✓' : 'Solicitar orçamento'}
        </button>
      </div>
    </article>
  );
}

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const { data: products, loading, error } = useAsync(listPublishedProducts, []);
  const { data: categories } = useAsync(listCategories, []);
  const q = params.get('q') ?? '';
  const cat = params.get('categoria') ?? '';
  const dim = params.get('dimensao') ?? '';

  const dims = useMemo(() => [...new Set((products ?? []).map((p) => p.dimensionsLabel))], [products]);
  const filtered = useMemo(() => {
    const nq = normalizeName(q);
    return (products ?? []).filter(
      (p) =>
        (!cat || p.categoryId === cat) &&
        (!dim || p.dimensionsLabel === dim) &&
        (!nq || normalizeName(`${p.name} ${p.dimensionsLabel} ${p.categoryName}`).includes(nq)),
    );
  }, [products, q, cat, dim]);
  const pg = usePagination(filtered, 9);

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="section">
      <div className="container">
        <h1>Comprar Paletes</h1>
        <p className="muted">Consulte os modelos e dimensões e solicite um orçamento. Os preços ainda não estão publicados: nossa equipe responde com as condições comerciais.</p>
        <div className="card white" style={{ marginBottom: 20 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="q">Pesquisar</label>
              <input id="q" type="search" value={q} onChange={(e) => update('q', e.target.value)} placeholder="Nome, categoria ou dimensões" />
            </div>
            <div className="field">
              <label htmlFor="cat">Categoria</label>
              <select id="cat" value={cat} onChange={(e) => update('categoria', e.target.value)}>
                <option value="">Todas</option>
                {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dim">Dimensões</label>
              <select id="dim" value={dim} onChange={(e) => update('dimensao', e.target.value)}>
                <option value="">Todas</option>
                {dims.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {(q || cat || dim) && <button className="btn sm ghost" onClick={() => setParams({})}>Limpar filtros</button>}
        </div>
        {error && <Alert kind="error">Não foi possível carregar os produtos. {error}</Alert>}
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <Empty title="Nenhum produto encontrado">Ajuste os filtros ou fale com a nossa equipe.</Empty>
        ) : (
          <>
            <div className="grid cols-3">{pg.slice.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            <Pager {...pg} />
          </>
        )}
      </div>
    </div>
  );
}

export function ProductDetail() {
  const { id = '' } = useParams();
  const { data: product, loading, error } = useAsync(() => getProduct(id), [id]);
  const { add } = useCart();
  const [qty, setQty] = useState(10);
  const [done, setDone] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <div className="container section"><Alert kind="error">{error}</Alert></div>;
  if (!product || !product.published) return <div className="container section"><Empty title="Produto não encontrado"><Link to="/comprar-paletes">Voltar ao catálogo</Link></Empty></div>;

  return (
    <div className="section">
      <div className="container grid cols-2">
        <ProductPhoto product={product} />
        <div className="stack">
          <p className="small"><Link to="/comprar-paletes">← Catálogo</Link></p>
          <h1>{product.name}</h1>
          <div className="dim" style={{ fontSize: '1.4rem' }}>{product.dimensionsLabel}</div>
          <p>{product.description}</p>
          <p className="small muted">Categoria: {product.categoryName} · Unidade de venda: {product.saleUnit}</p>
          {product.price == null ? <Alert kind="info">Preço sob consulta. Adicione ao carrinho e envie sua solicitação de orçamento.</Alert> : null}
          <div className="row">
            <div className="qty">
              <button aria-label="Diminuir" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <input aria-label="Quantidade" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value)) || 1))} />
              <button aria-label="Aumentar" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <button
              className="btn"
              disabled={!product.available}
              onClick={() => {
                add(product, qty);
                setDone(true);
              }}
            >
              {product.available ? 'Adicionar ao carrinho' : 'Indisponível no momento'}
            </button>
          </div>
          {done && <Alert kind="ok">Adicionado. <Link to="/carrinho">Ir para o carrinho</Link></Alert>}
        </div>
      </div>
    </div>
  );
}
