import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/services/auth';
import { resendVerification } from '@/services/auth';
import { useState } from 'react';
import { Alert } from '@/components/ui';

type Item = { to: string; label: string; end?: boolean; show?: boolean };

function DashShell({ title, groups }: { title: string; groups: { heading: string; items: Item[] }[] }) {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [sent, setSent] = useState(false);

  async function out() {
    await logout();
    nav('/');
  }

  return (
    <>
      <header className="site-header">
        <div className="inner">
          <Link to="/" className="brand" aria-label="Voltar ao site">
            <img src="/logo-multicaixas.png" alt="Multicaixas e Embalagens" width={44} height={44} />
            <span className="small">{title}</span>
          </Link>
          <span className="small muted" style={{ marginLeft: 'auto' }}>{profile?.fullName ?? user?.email}</span>
        </div>
      </header>
      <div className="dash">
        <aside className="dash-side" aria-label={title}>
          {groups.map((g) => (
            <div key={g.heading} style={{ display: 'contents' }}>
              <h4>{g.heading}</h4>
              {g.items.filter((i) => i.show !== false).map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end}>{i.label}</NavLink>
              ))}
            </div>
          ))}
          <h4>Conta</h4>
          <button className="link" onClick={out}>Sair</button>
        </aside>
        <div className="dash-main">
          {user && !user.emailVerified && (
            <Alert kind="warn">
              Seu e-mail ainda não foi verificado.{' '}
              {sent ? (
                'Enviamos um novo link para a sua caixa de entrada.'
              ) : (
                <button className="btn sm secondary" onClick={() => resendVerification(user).then(() => setSent(true))}>Reenviar e-mail de verificação</button>
              )}
            </Alert>
          )}
          <Outlet />
        </div>
      </div>
    </>
  );
}

export function CustomerLayout() {
  return (
    <DashShell
      title="Minha área"
      groups={[
        {
          heading: 'Painel',
          items: [
            { to: '/painel', label: 'Visão geral', end: true },
            { to: '/comprar-paletes', label: 'Comprar Paletes' },
            { to: '/painel/orcamentos', label: 'Meus Orçamentos' },
            { to: '/painel/pedidos', label: 'Meus Pedidos' },
            { to: '/painel/residuos', label: 'Minhas Ofertas de Resíduos' },
            { to: '/painel/notificacoes', label: 'Notificações' },
            { to: '/painel/perfil', label: 'Meu Perfil' },
            { to: '/painel/seguranca', label: 'Segurança' },
          ],
        },
      ]}
    />
  );
}

export function StaffLayout() {
  const { isAdmin, canEditProducts } = useAuth();
  return (
    <DashShell
      title="Painel da equipe"
      groups={[
        {
          heading: 'Operação comercial',
          items: [
            { to: '/equipe', label: 'Visão geral', end: true },
            { to: '/equipe/orcamentos', label: 'Solicitações de orçamento' },
            { to: '/equipe/pedidos', label: 'Pedidos de paletes' },
            { to: '/equipe/residuos', label: 'Ofertas de resíduos' },
            { to: '/equipe/propostas', label: 'Propostas comerciais' },
            { to: '/equipe/contatos', label: 'Contatos recebidos' },
            { to: '/equipe/relatorios', label: 'Relatórios' },
          ],
        },
        {
          heading: 'Cadastros',
          items: [
            { to: '/equipe/produtos', label: 'Produtos', show: isAdmin || canEditProducts },
            { to: '/equipe/clientes', label: 'Clientes e fornecedores' },
          ],
        },
        {
          heading: 'Administração',
          items: [
            { to: '/equipe/admin/usuarios', label: 'Usuários e permissões', show: isAdmin },
            { to: '/equipe/admin/categorias', label: 'Categorias', show: isAdmin },
            { to: '/equipe/admin/regioes', label: 'Regiões de Entrega', show: isAdmin },
            { to: '/equipe/admin/coleta', label: 'Cobertura de coleta de resíduos', show: isAdmin },
            { to: '/equipe/admin/configuracoes', label: 'Configurações', show: isAdmin },
            { to: '/equipe/admin/auditoria', label: 'Histórico de auditoria', show: isAdmin },
          ],
        },
      ]}
    />
  );
}
