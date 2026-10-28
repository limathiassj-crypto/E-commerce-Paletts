import { Link } from 'react-router-dom';
import { useAsync, Spinner } from '@/components/ui';
import { listDeliveryMunicipalities } from '@/services/delivery';
import { REGION_LABELS, type RegionKey } from '@/types';
import { SITE, whatsappLink } from '@/config/site';

export function HowItWorks() {
  return (
    <div className="section">
      <div className="container">
        <h1>Reaproveitamos madeira. Criamos novas possibilidades.</h1>
        <p className="muted prose">Da madeira descartada a novos produtos: veja como a Multicaixas avalia e reaproveita o material oferecido por empresas.</p>
        <div className="steps" style={{ margin: '28px 0' }}>
          <div className="card step"><h3>Recebimento</h3><p>Recebimento de ofertas de paletes usados e resíduos de madeira enviados por empresas.</p></div>
          <div className="card step"><h3>Avaliação</h3><p>Avaliação do material pela equipe, com base nas informações e fotografias enviadas.</p></div>
          <div className="card step"><h3>Reaproveitamento</h3><p>Reaproveitamento da madeira adequada, conforme as condições do material.</p></div>
          <div className="card step"><h3>Novos produtos</h3><p>Transformação do material em novos produtos, conforme os processos produtivos disponíveis.</p></div>
        </div>
        <div className="prose">
          <p>O reaproveitamento contribui para dar uso a materiais que seriam descartados e para reduzir desperdícios. A aceitação de cada oferta depende de avaliação comercial: nem todo material é aceito automaticamente.</p>
          <p>Os produtos comercializados pela Multicaixas não são, necessariamente, fabricados exclusivamente com madeira reaproveitada.</p>
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <Link className="btn" to="/vender-residuos">Oferecer resíduos</Link>
          <Link className="btn secondary" to="/comprar-paletes">Comprar paletes</Link>
        </div>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="section">
      <div className="container prose">
        <h1>Sobre a Multicaixas e Embalagens</h1>
        <p>A Multicaixas e Embalagens atua com a venda de paletes de madeira para empresas e com a compra de resíduos de madeira, incluindo paletes usados, danificados e sobras de madeira, para avaliação e possível reaproveitamento.</p>
        <p>Nossa sede fica em {SITE.headquarters}. As entregas de paletes são realizadas nos municípios cadastrados da Região Serrana, Baixada Fluminense e Região dos Lagos.</p>
        <p>Para falar com a equipe comercial, use o <Link to="/contato">formulário de contato</Link> ou o <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp {SITE.whatsapp.display}</a>.</p>
      </div>
    </div>
  );
}

export function DeliveryArea() {
  const { data, loading } = useAsync(listDeliveryMunicipalities, []);
  const active = (data ?? []).filter((m) => m.active);
  const regions = Object.keys(REGION_LABELS) as RegionKey[];
  return (
    <div className="section">
      <div className="container">
        <h1>Área de entrega de paletes</h1>
        <p className="muted prose">Realizamos entregas somente nos municípios cadastrados abaixo. Os agrupamentos são regiões comerciais da Multicaixas e não representam, necessariamente, a classificação administrativa ou turística oficial do estado. Frete e prazo são definidos pela equipe após a solicitação.</p>
        {loading ? <Spinner /> : (
          <div className="grid cols-3">
            {regions.map((r) => (
              <div className="card" key={r}>
                <h3>{REGION_LABELS[r]}</h3>
                <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
                  {active.filter((m) => m.region === r).map((m) => <li key={m.id}>{m.name}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop: 18 }}>Seu município não está na lista? <Link to="/contato">Entre em contato</Link> para consultar a possibilidade de atendimento.</p>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="section">
      <div className="container prose">
        <h1>Política de Privacidade</h1>
        <p className="muted">Modelo base alinhado à LGPD (Lei 13.709/2018). Revise com assessoria jurídica antes da publicação.</p>
        <h2>Dados que coletamos</h2>
        <p>Nome, e-mail, telefone, nome da empresa, CNPJ (opcional), endereço de entrega, informações e fotografias das ofertas de resíduos e mensagens enviadas pelos formulários.</p>
        <h2>Finalidade</h2>
        <p>Atender solicitações de orçamento, avaliar ofertas de resíduos de madeira, manter sua conta, enviar notificações sobre suas solicitações e cumprir obrigações legais.</p>
        <h2>Compartilhamento</h2>
        <p>Os dados são tratados pela equipe da Multicaixas e por provedores de infraestrutura (Google Firebase). Não vendemos dados pessoais.</p>
        <h2>Seus direitos</h2>
        <p>Você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão dos seus dados e revogar consentimentos. Envie sua solicitação pela página de <Link to="/contato">Contato</Link>, escolhendo o assunto "Outros assuntos" e indicando "Solicitação LGPD".</p>
        <h2>Segurança</h2>
        <p>Senhas são gerenciadas pelo Firebase Authentication e nunca armazenadas pela Multicaixas. O acesso aos registros é restrito por regras de segurança.</p>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="section">
      <div className="container prose">
        <h1>Termos de Uso</h1>
        <p className="muted">Modelo base. Revise com assessoria jurídica antes da publicação.</p>
        <h2>Natureza da plataforma</h2>
        <p>A plataforma permite solicitar orçamentos de paletes e oferecer resíduos de madeira para avaliação. Solicitações e ofertas não constituem compra, venda ou retirada confirmadas: dependem de proposta e aprovação comercial da Multicaixas.</p>
        <h2>Entrega e coleta</h2>
        <p>A entrega de paletes ocorre somente nos municípios cadastrados e está sujeita a frete e prazo definidos pela equipe. A coleta de resíduos segue cobertura própria.</p>
        <h2>Responsabilidades do usuário</h2>
        <p>Informar dados verdadeiros, manter a confidencialidade da senha e enviar apenas fotografias e informações sobre materiais de sua titularidade.</p>
      </div>
    </div>
  );
}
