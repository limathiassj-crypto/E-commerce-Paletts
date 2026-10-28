import { addDoc, collection, doc, getDoc, getDocs, getCountFromServer, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import type { AppNotification, ContactMessage, UserProfile } from '@/types';

/* ---------- Contato ---------- */

export async function sendContactMessage(data: {
  name: string;
  email: string;
  phone?: string;
  reason: string;
  subject: string;
  message: string;
  userId: string | null;
}) {
  await addDoc(collection(db, 'contact_messages'), { ...data, status: 'new', createdAt: serverTimestamp() });
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const snap = await getDocs(query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContactMessage);
}

export async function setContactStatus(id: string, status: ContactMessage['status']) {
  await updateDoc(doc(db, 'contact_messages', id), { status });
}

/* ---------- Notificações ---------- */

export async function listNotifications(uid: string): Promise<AppNotification[]> {
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true, readAt: serverTimestamp() });
}

export async function markAllRead(items: AppNotification[]) {
  const batch = writeBatch(db);
  items.filter((n) => !n.read).forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true, readAt: serverTimestamp() }));
  await batch.commit();
}

/* ---------- Usuários / permissões ---------- */

export async function listUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserProfile);
}

export async function setUserRole(uid: string, role: 'customer' | 'seller' | 'admin', canEditProducts: boolean) {
  const fn = httpsCallable(functions, 'setUserRole');
  await fn({ uid, role, canEditProducts });
}

/* ---------- Configurações e auditoria ---------- */

export async function getSettings(id: 'public' | 'company') {
  const snap = await getDoc(doc(db, 'app_settings', id));
  return snap.exists() ? (snap.data() as Record<string, string>) : {};
}

export async function saveSettings(id: 'public' | 'company', data: Record<string, string>) {
  await updateDoc(doc(db, 'app_settings', id), { ...data, updatedAt: serverTimestamp() }).catch(async () => {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'app_settings', id), { ...data, updatedAt: serverTimestamp() });
  });
}

export async function listAuditLogs() {
  const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')));
  return snap.docs.slice(0, 200).map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string });
}

/* ---------- Indicadores reais (contagens no banco) ---------- */

async function count(col: string, ...cs: ReturnType<typeof where>[]) {
  const snap = await getCountFromServer(query(collection(db, col), ...cs));
  return snap.data().count;
}

export async function loadAdminStats() {
  const [users, openQuotes, negotiating, offers, offersWaiting, products, orders] = await Promise.all([
    count('users'),
    count('quotes', where('status', 'in', ['submitted', 'in_review', 'info_requested'])),
    count('quotes', where('status', 'in', ['in_negotiation', 'proposal_sent'])),
    count('residue_offers'),
    count('residue_offers', where('status', 'in', ['submitted', 'in_review'])),
    count('products', where('published', '==', true)),
    count('orders', where('status', '==', 'completed')),
  ]);
  return { users, openQuotes, negotiating, offers, offersWaiting, products, orders };
}
