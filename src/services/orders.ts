import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { SITE } from '@/config/site';
import { checkDeliveryCoverage } from '@/services/delivery';
import type { Cart, CartItem, DeliveryInfo, HistoryEntry, Quote, QuoteStatus, ResidueOffer, ResidueStatus } from '@/types';

/* ---------------- Carrinho ---------------- */

export async function loadCart(uid: string): Promise<CartItem[]> {
  const snap = await getDoc(doc(db, 'carts', uid));
  return snap.exists() ? ((snap.data() as Cart).items ?? []) : [];
}

export async function saveCart(uid: string, items: CartItem[]) {
  await setDoc(doc(db, 'carts', uid), { items, updatedAt: serverTimestamp() });
}

/* ---------------- Orçamentos ---------------- */

export async function submitQuote(params: { userId: string; items: CartItem[]; delivery: DeliveryInfo; notes?: string }) {
  if (params.items.length === 0) throw new Error('Adicione ao menos um produto ao carrinho.');
  // Verificação informativa no cliente; a Cloud Function revalida e grava o resultado oficial.
  const coverage = await checkDeliveryCoverage(params.delivery.municipality, params.delivery.state);
  const ref = await addDoc(collection(db, 'quotes'), {
    userId: params.userId,
    organizationId: SITE.defaultOrganizationId,
    items: params.items,
    delivery: params.delivery,
    deliveryCoverage: coverage.covered ? 'covered' : 'not_covered',
    notes: params.notes ?? '',
    status: 'submitted' as QuoteStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await saveCart(params.userId, []);
  return ref.id;
}

export async function listMyQuotes(uid: string): Promise<Quote[]> {
  const snap = await getDocs(query(collection(db, 'quotes'), where('userId', '==', uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quote);
}

export async function listQuotes(filters: { status?: QuoteStatus } = {}): Promise<Quote[]> {
  const cs: QueryConstraint[] = [];
  if (filters.status) cs.push(where('status', '==', filters.status));
  cs.push(orderBy('createdAt', 'desc'));
  const snap = await getDocs(query(collection(db, 'quotes'), ...cs));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quote);
}

export async function getQuote(id: string): Promise<Quote | null> {
  const snap = await getDoc(doc(db, 'quotes', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Quote) : null;
}

export async function cancelMyQuote(id: string) {
  await updateDoc(doc(db, 'quotes', id), { status: 'cancelled', updatedAt: serverTimestamp() });
}

export async function getInternalNotes(quoteId: string): Promise<string> {
  const snap = await getDoc(doc(db, 'quotes', quoteId, 'private', 'notes'));
  return snap.exists() ? (snap.data().text as string) : '';
}

export async function updateQuoteStatus(id: string, status: QuoteStatus, actorId: string, note?: string, internalNotes?: string) {
  await updateDoc(doc(db, 'quotes', id), { status, updatedAt: serverTimestamp() });
  // Observações internas ficam em subcoleção restrita à equipe (o cliente não consegue lê-las).
  if (internalNotes !== undefined) {
    await setDoc(doc(db, 'quotes', id, 'private', 'notes'), { text: internalNotes, updatedBy: actorId, updatedAt: serverTimestamp() });
  }
  await addDoc(collection(db, 'quotes', id, 'history'), {
    actorId,
    action: `status:${status}`,
    note: note ?? '',
    createdAt: serverTimestamp(),
  });
}

export async function getHistory(col: 'quotes' | 'residue_offers', id: string): Promise<HistoryEntry[]> {
  const snap = await getDocs(query(collection(db, col, id, 'history'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HistoryEntry);
}

/* ---------------- Propostas comerciais ---------------- */

export interface ProposalInput {
  quoteId?: string;
  offerId?: string;
  userId: string;
  kind: 'quote' | 'residue';
  amount: number | null;
  conditions: string;
}

export async function createProposal(input: ProposalInput, actorId: string) {
  const ref = await addDoc(collection(db, 'commercial_proposals'), {
    ...input,
    organizationId: SITE.defaultOrganizationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: actorId,
  });
  return ref.id;
}

export async function listProposalsForUser(uid: string) {
  const snap = await getDocs(query(collection(db, 'commercial_proposals'), where('userId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalInput & { id: string; createdAt: unknown });
}

export async function listAllProposals() {
  const snap = await getDocs(collection(db, 'commercial_proposals'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProposalInput & { id: string; createdAt: unknown });
}

/* ---------------- Pedidos ---------------- */

export async function listMyOrders(uid: string) {
  const snap = await getDocs(query(collection(db, 'orders'), where('userId', '==', uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; status: string; quoteId?: string; createdAt: unknown });
}

export async function listAllOrders() {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; userId: string; status: string; quoteId?: string; createdAt: unknown });
}

/* ---------------- Resíduos ---------------- */

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePhotos(files: File[]): string | null {
  if (files.length > MAX_PHOTOS) return `Envie no máximo ${MAX_PHOTOS} fotografias.`;
  for (const f of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(f.type)) return `"${f.name}": use JPG, PNG ou WebP.`;
    if (f.size >= MAX_PHOTO_BYTES) return `"${f.name}": o tamanho máximo é 5 MB.`;
  }
  return null;
}

export type ResidueOfferInput = Omit<
  ResidueOffer,
  'id' | 'userId' | 'organizationId' | 'photos' | 'status' | 'createdAt' | 'updatedAt'
>;

export async function submitResidueOffer(params: { userId: string; data: ResidueOfferInput; files: File[]; asDraft?: boolean }) {
  const err = validatePhotos(params.files);
  if (err) throw new Error(err);

  const offerRef = doc(collection(db, 'residue_offers'));
  const urls: string[] = [];
  for (const file of params.files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `residue_offers/${params.userId}/${offerRef.id}/${Date.now()}_${safe}`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    urls.push(await getDownloadURL(fileRef));
  }
  await setDoc(offerRef, {
    ...params.data,
    userId: params.userId,
    organizationId: SITE.defaultOrganizationId,
    photos: urls,
    status: (params.asDraft ? 'draft' : 'submitted') as ResidueStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return offerRef.id;
}

export async function removeOfferPhoto(url: string) {
  await deleteObject(ref(storage, url));
}

export async function listMyOffers(uid: string): Promise<ResidueOffer[]> {
  const snap = await getDocs(query(collection(db, 'residue_offers'), where('userId', '==', uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ResidueOffer);
}

export async function listOffers(filters: { status?: ResidueStatus } = {}): Promise<ResidueOffer[]> {
  const cs: QueryConstraint[] = [];
  if (filters.status) cs.push(where('status', '==', filters.status));
  cs.push(orderBy('createdAt', 'desc'));
  const snap = await getDocs(query(collection(db, 'residue_offers'), ...cs));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ResidueOffer);
}

export async function getOffer(id: string): Promise<ResidueOffer | null> {
  const snap = await getDoc(doc(db, 'residue_offers', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ResidueOffer) : null;
}

export async function cancelMyOffer(id: string) {
  await updateDoc(doc(db, 'residue_offers', id), { status: 'cancelled', updatedAt: serverTimestamp() });
}

/** A equipe registra avaliação e condições. Nada é confirmado sem a decisão explícita da equipe. */
export async function updateOfferByStaff(
  id: string,
  patch: {
    status: ResidueStatus;
    evaluation?: string;
    proposedPrice?: number | null;
    approvedQuantity?: number | null;
    transportConditions?: string;
  },
  actorId: string,
  note?: string,
) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null));
  await updateDoc(doc(db, 'residue_offers', id), { ...clean, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'residue_offers', id, 'history'), {
    actorId,
    action: `status:${patch.status}`,
    note: note ?? '',
    createdAt: serverTimestamp(),
  });
}
