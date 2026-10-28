# Multicaixas e Embalagens — Plataforma B2B

Loja de paletes (modo "Solicitar orçamento") + compra de resíduos de madeira, com Firebase real
(Authentication, Firestore, Storage, Cloud Functions, Security Rules), painel do cliente, painel da equipe
comercial e painel administrativo.

> **Status:** código completo escrito, mas **ainda não compilado nem testado** (o ambiente em que foi gerado
> não tinha acesso ao registro npm). Rode os passos abaixo e o checklist de testes antes de publicar.

## 1. Instalação

```bash
npm install
cd functions && npm install && cd ..
cp .env.example .env.local     # preencha com a config do app web do Firebase
npm run typecheck              # corrija qualquer ajuste de tipo que apareça
npm run dev
```

## 2. O que você precisa configurar no Firebase (Console)

1. Criar o projeto Firebase e registrar um **App Web** → copiar as chaves para `.env.local`.
2. **Authentication** → ativar o provedor *E-mail/senha*; em *Modelos de e-mail* ajustar verificação e redefinição de senha para português; em *Domínios autorizados* incluir o domínio de produção.
3. **Firestore** → criar o banco em modo produção (região `southamerica-east1` recomendada).
4. **Storage** → ativar o bucket.
5. **Functions** → exige o plano **Blaze** (pagamento por uso, com cota gratuita).
6. Instalar a CLI e publicar regras, índices e funções:
   ```bash
   npm i -g firebase-tools && firebase login && firebase use <id-do-projeto>
   firebase deploy --only firestore:rules,firestore:indexes,storage
   cd functions && npm run deploy
   ```

## 3. Dados iniciais (seed) e primeiro administrador

Baixe uma chave de serviço (Console → Configurações → Contas de serviço) para `serviceAccountKey.json`
(**nunca** versione este arquivo; já está no `.gitignore`).

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
npm run seed                                   # 3 categorias, 7 produtos, 41 municípios
# 1) crie sua conta pelo site (Criar Conta)
node scripts/make-admin.mjs seu-email@empresa.com.br
# 2) saia e entre novamente no site para o papel de administrador valer
```

Depois disso, vendedores e novos administradores são atribuídos em **Equipe → Usuários e permissões**
(Cloud Function `setUserRole`, com auditoria). Usuários comuns não conseguem se promover.

## 4. Arquitetura

| Pasta | Conteúdo |
|---|---|
| `src/config/site.ts` | Dados comerciais; **WhatsApp configurado em um único lugar** |
| `src/services/` | Acesso ao Firebase (auth, catálogo, entrega, pedidos/resíduos, misc) |
| `src/context/` | Sessão/permissões (claims) e carrinho persistente (localStorage + Firestore) |
| `src/pages/public, customer, staff` | Site, painel do cliente, painel da equipe/admin |
| `firestore.rules`, `storage.rules` | Regras reais (papéis via Custom Claims) |
| `functions/src/index.ts` | `setUserRole`, revalidação de cobertura, notificações, auditoria |

Principais decisões de segurança:
- Papéis (`seller`, `admin`) vivem em **Custom Claims**, só alteráveis pela Function `setUserRole`.
- Cliente cria orçamentos apenas com status `submitted` e sem preço; a cobertura de entrega é **revalidada no servidor** (`onQuoteCreated`) e nada confirma frete, prazo ou transporte.
- Observações internas ficam em subcoleção `private`, ilegível para o cliente.
- Notificações e auditoria só são escritas por Cloud Functions.
- Entrega de paletes (`delivery_regions`) e coleta de resíduos (`residue_collection_regions`) são coleções **independentes**.
- Preparado para multiempresa: documentos carregam `organizationId` (`SITE.defaultOrganizationId`). **Isolamento multi-tenant ainda NÃO está implementado** nas regras; ao habilitar, é preciso incluir `organizationId` nas claims e em todas as regras.

## 5. Pendências que dependem de você

- Fotografias reais dos produtos (hoje aparece "Imagem ilustrativa"); envio de fotos de produto pelo admin ainda não tem tela (o campo `photos` existe).
- Preços, frete e pagamento (modo "Solicitar orçamento" ativo; nenhum valor fictício).
- Revisão jurídica da Política de Privacidade e dos Termos (modelos-base).
- Envio de e-mail/WhatsApp automático: hoje, mensagens de contato e notificações são **registradas no Firestore**; não há envio externo.
- Cobertura de coleta de resíduos começa **vazia** (cadastre em Equipe → Cobertura de coleta).

## 6. Checklist de publicação

- [ ] `npm run typecheck` e `npm run build` sem erros
- [ ] `.env.local` preenchido; chave de serviço fora do repositório
- [ ] Regras, índices e Functions publicados; seed executado; primeiro admin criado
- [ ] Domínio autorizado no Authentication; e-mails em português
- [ ] Orçamento de teste: cliente cria → equipe responde → cliente vê proposta e histórico
- [ ] Oferta de resíduos com fotos (JPG/PNG/WebP até 5 MB)
- [ ] Cliente A não consegue abrir registros do cliente B (teste no emulador/Rules Playground)
- [ ] Vendedor não acessa `/equipe/admin/*`; usuário comum não acessa `/equipe`
- [ ] Município fora da lista exibe a mensagem de não atendimento
- [ ] WhatsApp abre `https://wa.me/5524992358331` (cabeçalho, rodapé, contato, carrinho)
- [ ] Lighthouse/responsividade em celular e tablet
- [ ] `firebase deploy --only hosting` (após `npm run build`)
