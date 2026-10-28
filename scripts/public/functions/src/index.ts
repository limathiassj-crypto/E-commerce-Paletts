import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

const db = getFirestore();
const auth = getAuth();

type Role = 'customer' | 'seller' | 'admin';

/** Remove acentos, espaços extras e normaliza caixa. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function writeAudit(entry: {
  action: string;
  collection: string;
  documentId: string;
  actorId: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await db.collection('audit_logs').add({
    ...entry,
    before: entry.before ?? null,
    after: entry.after ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function notify(userId: string, title: string, body: string, link: string) {
  await db.collection('notifications').add({
    userId,
    title,
    body,
    link,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Atribui papéis. Somente administradores autenticados (claim role=admin) podem chamar.
 * O PRIMEIRO administrador deve ser criado com scripts/make-admin.mjs (ver README).
 */
export const setUserRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem atribuir funções.');
  }
  const { uid, role, canEditProducts } = request.data as {
    uid?: string;
    role?: Role;
    canEditProducts?: boolean;
  };
  if (!uid || !role || !['customer', 'seller', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Informe uid e função válidos.');
  }
  if (uid === request.auth.uid && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'Você não pode remover o próprio acesso de administrador.');
  }
  await auth.setCustomUserClaims(uid, { role, canEditProducts: role === 'seller' ? !!canEditProducts : false });
  await db.doc(`users/${uid}`).set({ role, canEditProducts: !!canEditProducts, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAudit({
    action: 'set_user_role',
    collection: 'users',
    documentId: uid,
    actorId: request.auth.uid,
    after: { role, canEditProducts: !!canEditProducts },
  });
  return { ok: true };
});

/** Quando um orçamento é criado: revalida a cobertura no servidor e abre o histórico. */
export const onQuoteCreated = onDocumentCreated('quotes/{quoteId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const quote = snap.data();
  const municipality: string = quote.delivery?.municipality ?? '';
  const state: string = quote.delivery?.state ?? '';
  const normalized = normalizeName(municipality);

  let covered = false;
  if (state === 'RJ' && normalized) {
    const match = await db
      .collection('delivery_regions')
      .where('normalizedName', '==', normalized)
      .where('active', '==', true)
      .limit(1)
      .get();
    covered = !match.empty;
  }

  await snap.ref.update({
    deliveryCoverage: covered ? 'covered' : 'not_covered',
    coverageCheckedAt: FieldValue.serverTimestamp(),
  });
  await snap.ref.collection('history').add({
    actorId: 'system',
    action: 'created',
    note: covered
      ? 'Solicitação recebida. Município atendido; condições de entrega serão avaliadas pela equipe.'
      : 'Solicitação recebida. Município fora da cobertura cadastrada; a equipe avaliará a possibilidade de atendimento.',
    createdAt: FieldValue.serverTimestamp(),
  });
  await notify(quote.userId, 'Solicitação de orçamento recebida', 'Nossa equipe irá analisar e entrar em contato.', `/painel/orcamentos/${snap.id}`);
});

/** Mudança de status em orçamentos: notifica o cliente e registra histórico. */
export const onQuoteUpdated = onDocumentUpdated('quotes/{quoteId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  await notify(after.userId, 'Orçamento atualizado', `Novo status: ${after.status}`, `/painel/orcamentos/${event.params.quoteId}`);
});

export const onResidueOfferCreated = onDocumentCreated('residue_offers/{offerId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const offer = snap.data();
  await snap.ref.collection('history').add({
    actorId: 'system',
    action: 'created',
    note: 'Oferta recebida. Aguardando avaliação da equipe. Nenhuma compra ou retirada é confirmada automaticamente.',
    createdAt: FieldValue.serverTimestamp(),
  });
  if (offer.status === 'submitted') {
    await notify(offer.userId, 'Oferta de resíduos enviada', 'Sua oferta será avaliada pela equipe da Multicaixas.', `/painel/residuos/${snap.id}`);
  }
});

export const onResidueOfferUpdated = onDocumentUpdated('residue_offers/{offerId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  await notify(after.userId, 'Oferta de resíduos atualizada', `Novo status: ${after.status}`, `/painel/residuos/${event.params.offerId}`);
});

export const onProposalWritten = onDocumentWritten('commercial_proposals/{proposalId}', async (event) => {
  const after = event.data?.after.data();
  if (!after || event.data?.before.exists) return;
  await notify(after.userId, 'Nova proposta comercial', 'Há uma nova proposta disponível para sua análise.', '/painel/orcamentos');
});

/** Auditoria automática das alterações administrativas de configuração. */
function auditTrigger(col: string) {
  return onDocumentWritten(`${col}/{docId}`, async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    await writeAudit({
      action: !before ? 'create' : !after ? 'delete' : 'update',
      collection: col,
      documentId: event.params.docId,
      actorId: (after?.updatedBy as string | undefined) ?? null,
      before,
      after,
    });
  });
}

export const auditDeliveryRegions = auditTrigger('delivery_regions');
export const auditCollectionRegions = auditTrigger('residue_collection_regions');
export const auditProducts = auditTrigger('products');
export const auditSettings = auditTrigger('app_settings');
