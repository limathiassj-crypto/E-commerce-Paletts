import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { listPublishedProducts } from '@/services/catalog';
import { Spinner, useAsync } from '@/components/ui';
import { ProductCard } from '@/pages/public/Catalog';
import { REGION_LABELS } from '@/types';
import seed from '@/data/seed-data.json';
import { whatsappLink } from '@/config/site';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const { data, loading } = useAsync(listPublishedProducts, []);
  useEffect(() => {
    document.title = 'Multicaixas e Embalagens | Paletes e reaproveitamento de madeira';
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Paletes e soluções inteligentes para sua operação.</h1>
          <p>Atendemos empresas com soluções em paletes e reaproveitamento de madeira.</p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn lg" style={{ background: '#f5f0e8', color: '#352719', borderColor: '#f5f0e8' }} to="/comprar-paletes">COMPRAR PALETES</Link>
            <Link className="btn lg secondary" style={{ color: '#fff', borderColor: '#fff' }} to="/vender-residuos">VENDER RESÍDUOS</Link>
          </div>
          <p className="note">Imagem ilustrativa de fundo. Fotografias reais dos produtos serão publicadas assim que disponibilizadas.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid cols-2">
          <div className="card">
            <h2>Comprar Paletes</h2>
            <p>Encontre o modelo de palete adequado para sua operação, consulte as dimensões e solicite um orçamento.</p>
            <Link className="btn" to="/comprar-paletes">ACESSAR LOJA</Link>
          </div>
          <div className="card">
            <h2>Vender Resíduos</h2>
            <p>Sua empresa possui paletes usados ou resíduos de madeira? Ofereça seus materiais à Multicaixas para avaliação e possível compra.</p>
            <Link className="btn" to="/vender-residuos">OFERECER RESÍDUOS</Link>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="row between">
            <h2>Produtos em destaque</h2>
            <Link className="btn secondary sm" to="/comprar-paletes">Ver todos</Link>
          </div>
          {loading ? <Spinner /> : (
            <div className="grid cols-3">{(data ?? []).slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container grid cols-2">
          <div>
            <h2>Sobre a Multicaixas</h2>
            <p>A Multicaixas e Embalagens atua com a venda de paletes de madeira e a compra de resíduos de madeira de empresas, com sede em São José do Vale do Rio Preto, RJ.</p>
            <Link className="btn secondary" to="/sobre">Conheça a empresa</Link>
          </div>
          <div>
            <h2>Reaproveitamento de madeira</h2>
            <p>Avaliamos paletes usados e resíduos de madeira oferecidos por empresas e reaproveitamos a madeira adequada em novos produtos, conforme as características do material e os processos produtivos disponíveis.</p>
            <Link className="btn secondary" to="/como-funciona">Como funciona</Link>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <h2>Regiões de entrega de paletes</h2>
          <p className="muted">Entregamos somente nos municípios cadastrados das regiões comerciais abaixo. Consulte a possibilidade de atendimento para outras localidades.</p>
          <div className="grid cols-3">
            {(Object.keys(seed.deliveryRegions) as (keyof typeof seed.deliveryRegions)[]).map((k) => (
              <div className="card" key={k}>
                <h3>{REGION_LABELS[k]}</h3>
                <p className="small muted">{seed.deliveryRegions[k].length} municípios cadastrados</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}><Link to="/area-de-entrega">Ver lista completa de municípios →</Link></p>
        </div>
      </section>

      <section className="section">
        <div className="container card white center">
          <h2>Fale com a nossa equipe comercial</h2>
          <p>Dúvidas sobre produtos, entrega ou venda de resíduos? Atendemos pelo WhatsApp e pelo formulário de contato.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn whats" href={whatsappLink()} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            <Link className="btn secondary" to="/contato">Formulário de contato</Link>
            {!user && <Link className="btn" to="/criar-conta">Criar conta</Link>}
            {!user && <Link className="btn secondary" to="/entrar">Entrar</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
