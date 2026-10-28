// Cria o PRIMEIRO administrador (processo administrativo seguro, fora do navegador).
// Uso:  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/make-admin.mjs email@empresa.com.br
// O usuário precisa já ter criado a conta no site. Depois disso, novos vendedores/admins
// são atribuídos pelo painel administrativo (Cloud Function setUserRole).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const email = process.argv[2];
if (!email) {
  console.error('Informe o e-mail: node scripts/make-admin.mjs email@empresa.com.br');
  process.exit(1);
}
initializeApp({ credential: applicationDefault() });
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role: 'admin', canEditProducts: true });
await getFirestore().doc(`users/${user.uid}`).set({ role: 'admin', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
await getFirestore().collection('audit_logs').add({
  action: 'bootstrap_admin',
  collection: 'users',
  documentId: user.uid,
  actorId: 'script',
  before: null,
  after: { role: 'admin' },
  createdAt: FieldValue.serverTimestamp(),
});
console.log(`OK: ${email} agora é administrador. Peça para sair e entrar novamente no site.`);
