import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PublicLayout } from '@/components/Layout';
import { CustomerLayout, StaffLayout } from '@/components/DashLayout';
import { RequireAuth, RequireStaff } from '@/components/Guards';
import { Alert } from '@/components/ui';
import { firebaseConfigured } from '@/lib/firebase';
import Home from '@/pages/public/Home';
import { Catalog, ProductDetail } from '@/pages/public/Catalog';
import CartPage from '@/pages/public/CartPage';
import Contact from '@/pages/public/Contact';
import { About, DeliveryArea, HowItWorks, Privacy, Terms } from '@/pages/public/Institutional';
import { NewResidueOffer, SellResidues } from '@/pages/public/SellResidues';
import { ForgotPassword, Login, Register } from '@/pages/public/AuthPages';
import { MyOffers, MyOrders, MyQuotes, Notifications, OfferDetail, Overview, Profile, QuoteDetail, Security } from '@/pages/customer/CustomerPages';
import {
  StaffClients, StaffContacts, StaffOfferDetail, StaffOffers, StaffOrders, StaffOverview, StaffProducts,
  StaffProposals, StaffQuoteDetail, StaffQuotes, StaffReports,
} from '@/pages/staff/StaffPages';
import {
  AdminAudit, AdminCategories, AdminCollectionRegions, AdminDeliveryRegions, AdminSettings, AdminStats, AdminUsers,
} from '@/pages/staff/AdminPages';
import { useAuth } from '@/context/AuthContext';

function StaffHome() {
  const { isAdmin } = useAuth();
  return (
    <>
      <StaffOverview />
      {isAdmin && <div style={{ marginTop: 28 }}><AdminStats /></div>}
    </>
  );
}

export default function App() {
  if (!firebaseConfigured) {
    return (
      <div className="container section">
        <Alert kind="warn">
          Firebase não configurado. Copie <code>.env.example</code> para <code>.env.local</code> e preencha as variáveis <code>VITE_FIREBASE_*</code> (veja o README).
        </Alert>
      </div>
    );
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="comprar-paletes" element={<Catalog />} />
              <Route path="produto/:id" element={<ProductDetail />} />
              <Route path="carrinho" element={<CartPage />} />
              <Route path="vender-residuos" element={<SellResidues />} />
              <Route path="como-funciona" element={<HowItWorks />} />
              <Route path="sobre" element={<About />} />
              <Route path="area-de-entrega" element={<DeliveryArea />} />
              <Route path="contato" element={<Contact />} />
              <Route path="privacidade" element={<Privacy />} />
              <Route path="termos" element={<Terms />} />
              <Route path="entrar" element={<Login />} />
              <Route path="criar-conta" element={<Register />} />
              <Route path="recuperar-senha" element={<ForgotPassword />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="painel" element={<CustomerLayout />}>
                <Route index element={<Overview />} />
                <Route path="orcamentos" element={<MyQuotes />} />
                <Route path="orcamentos/:id" element={<QuoteDetail />} />
                <Route path="pedidos" element={<MyOrders />} />
                <Route path="residuos" element={<MyOffers />} />
                <Route path="residuos/nova" element={<NewResidueOffer />} />
                <Route path="residuos/:id" element={<OfferDetail />} />
                <Route path="notificacoes" element={<Notifications />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="seguranca" element={<Security />} />
              </Route>
            </Route>

            <Route element={<RequireStaff />}>
              <Route path="equipe" element={<StaffLayout />}>
                <Route index element={<StaffHome />} />
                <Route path="orcamentos" element={<StaffQuotes />} />
                <Route path="orcamentos/:id" element={<StaffQuoteDetail />} />
                <Route path="pedidos" element={<StaffOrders />} />
                <Route path="residuos" element={<StaffOffers />} />
                <Route path="residuos/:id" element={<StaffOfferDetail />} />
                <Route path="propostas" element={<StaffProposals />} />
                <Route path="contatos" element={<StaffContacts />} />
                <Route path="relatorios" element={<StaffReports />} />
                <Route path="produtos" element={<StaffProducts />} />
                <Route path="clientes" element={<StaffClients />} />
                <Route element={<RequireStaff adminOnly />}>
                  <Route path="admin/usuarios" element={<AdminUsers />} />
                  <Route path="admin/categorias" element={<AdminCategories />} />
                  <Route path="admin/regioes" element={<AdminDeliveryRegions />} />
                  <Route path="admin/coleta" element={<AdminCollectionRegions />} />
                  <Route path="admin/configuracoes" element={<AdminSettings />} />
                  <Route path="admin/auditoria" element={<AdminAudit />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
