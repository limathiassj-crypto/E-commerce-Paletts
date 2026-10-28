/**
 * Configuração comercial centralizada.
 * O número do WhatsApp é definido SOMENTE aqui; todo o projeto o consome por este módulo.
 */
export const SITE = {
  name: 'Multicaixas e Embalagens',
  shortName: 'Multicaixas',
  headquarters: 'São José do Vale do Rio Preto, RJ',
  whatsapp: {
    display: '+55 24 99235-8331',
    digits: '5524992358331',
    link: 'https://wa.me/5524992358331',
  },
  /** Multiempresa (futuro): ao habilitar, todo documento passa a carregar organizationId. */
  defaultOrganizationId: 'multicaixas',
  multiTenantEnabled: false,
} as const;

export function whatsappLink(message?: string): string {
  const base = SITE.whatsapp.link;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
