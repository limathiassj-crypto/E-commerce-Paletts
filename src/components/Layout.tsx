import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SITE, whatsappLink } from '@/config/site';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export function PublicLayout() {
  const { user, isStaff } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    nav(`/comprar-paletes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className={`site-header ${open ? 'open' : ''}`}>
        <div className="inner">
          <Link to="/" className="brand" aria-label="Multicaixas e Embalagens — início">
            <img src="/logo-multicaixas.png" alt="Logo Multicaixas e Embalagens" width={52} height={52} />
          </Link>
          <button className="btn ghost menu-toggle" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
            {open ? 'Fechar' : 'Menu'}
          </button>
          <nav className="nav" id="menu" aria-label="Principal">
            <NavLink to="/" end>Início</NavLink>
            <NavLink to="/comprar-paletes">Comprar Paletes</NavLink>
            <NavLink to="/vender-residuos">Vender Resíduos</NavLink>
            <NavLink to="/como-funciona">Como Funciona</NavLink>
            <NavLink to="/sobre">Sobre a Empresa</NavLink>
            <NavLink to="/contato">Contato</NavLink>
          </nav>
          <div className="header-actions">
            <form className="search" onSubmit={onSearch} role="search">
              <label className="visually-hidden" htmlFor="busca">Pesquisar produtos</label>
              <input id="busca" type="search" placeholder="Pesquisar paletes" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <Link to="/carrinho" className="cart-link" aria-label={`Carrinho, ${count} itens`}>
              Carrinho<span className="count">{count}</span>
            </Link>
            <a className="btn sm whats" href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            {user ? (
              <>
                <Link className="btn sm secondary" to={isStaff ? '/equipe' : '/painel'}>{isStaff ? 'Painel da equipe' : 'Minha área'}</Link>
              </>
            ) : (
              <>
                <Link className="btn sm secondary" to="/entrar">Entrar</Link>
                <Link className="btn sm" to="/criar-conta">Criar Conta</Link>
              </>
            )}
          </div>
        </div>
        <div className="cta-bar">
          <div className="inner">
            <Link className="btn" to="/comprar-paletes">COMPRAR PALETES</Link>
            <Link className="btn alt" to="/vender-residuos">VENDER RESÍDUOS</Link>
          </div>
        </div>
      </header>
      <main id="conteudo">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="grid cols-4">
          <div>
            <h4>{SITE.name}</h4>
            <p className="small">Sede em {SITE.headquarters}.</p>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp {SITE.whatsapp.display}</a>
          </div>
          <div>
            <h4>Paletes</h4>
            <Link to="/comprar-paletes">Comprar Paletes</Link>
            <Link to="/carrinho">Carrinho</Link>
            <Link to="/area-de-entrega">Área de entrega</Link>
          </div>
          <div>
            <h4>Resíduos de madeira</h4>
            <Link to="/vender-residuos">Vender Resíduos</Link>
            <Link to="/como-funciona">Da madeira descartada a novos produtos</Link>
          </div>
          <div>
            <h4>Institucional</h4>
            <Link to="/sobre">Sobre a Empresa</Link>
            <Link to="/contato">Contato</Link>
            <Link to="/privacidade">Política de Privacidade</Link>
            <Link to="/termos">Termos de Uso</Link>
          </div>
        </div>
        <div className="legal">© {new Date().getFullYear()} {SITE.name}. Todos os direitos reservados.</div>
      </div>
    </footer>
  );
}
