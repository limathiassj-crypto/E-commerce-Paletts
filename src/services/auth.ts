import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AccountType } from '@/types';

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  companyName?: string;
  accountTypes: AccountType[];
}

/** Cadastro real: Auth cria a identidade; o Firestore guarda apenas o perfil (nunca a senha). */
export async function signUp(input: SignUpInput): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const now = serverTimestamp();
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    fullName: input.fullName.trim(),
    email: input.email,
    phone: input.phone,
    companyName: input.companyName?.trim() ?? '',
    accountTypes: input.accountTypes,
    acceptedTermsAt: now,
    acceptedPrivacyAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await sendEmailVerification(cred.user);
  return cred.user;
}

export const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const resendVerification = (user: User) => sendEmailVerification(user);

export async function changePassword(user: User, current: string, next: string) {
  if (!user.email) throw new Error('Conta sem e-mail.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
}

export async function updateProfile(
  uid: string,
  data: { fullName: string; phone: string; companyName?: string; accountTypes: AccountType[] },
) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  'auth/requires-recent-login': 'Faça login novamente para concluir esta ação.',
};

export function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  if (code === 'permission-denied') return 'Você não tem permissão para realizar esta ação.';
  if (code === 'unavailable') return 'Serviço temporariamente indisponível. Tente novamente.';
  return (err as Error)?.message || 'Ocorreu um erro inesperado. Tente novamente.';
}
