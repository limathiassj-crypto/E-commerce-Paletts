import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeName, slugify } from '@/lib/normalize';
import type { DeliveryRegionMunicipality, RegionKey } from '@/types';

export const COVERED_MESSAGE = 'Atendemos seu município! Envie sua solicitação para consultar as condições de entrega.';
export const NOT_COVERED_MESSAGE =
  'No momento, realizamos entregas somente nos municípios cadastrados da Região Serrana, Baixada Fluminense e Região dos Lagos. Entre em contato para consultar a possibilidade de atendimento.';

export interface CoverageResult {
  covered: boolean;
  municipality?: DeliveryRegionMunicipality;
  message: string;
}

/**
 * Consulta a lista cadastrada no Firestore. A interface só informa; a Cloud Function `onQuoteCreated`
 * revalida no servidor. Nada aqui confirma frete, prazo ou transporte.
 */
export async function checkDeliveryCoverage(municipality: string, state: string): Promise<CoverageResult> {
  const normalized = normalizeName(municipality);
  if (!normalized || state.trim().toUpperCase() !== 'RJ') {
    return { covered: false, message: NOT_COVERED_MESSAGE };
  }
  const snap = await getDocs(
    query(collection(db, 'delivery_regions'), where('normalizedName', '==', normalized), where('active', '==', true), limit(1)),
  );
  if (snap.empty) return { covered: false, message: NOT_COVERED_MESSAGE };
  const d = snap.docs[0];
  return { covered: true, municipality: { id: d.id, ...d.data() } as DeliveryRegionMunicipality, message: COVERED_MESSAGE };
}

export async function listDeliveryMunicipalities(): Promise<DeliveryRegionMunicipality[]> {
  const snap = await getDocs(collection(db, 'delivery_regions'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DeliveryRegionMunicipality)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function listResidueCollectionRegions(): Promise<DeliveryRegionMunicipality[]> {
  const snap = await getDocs(collection(db, 'residue_collection_regions'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DeliveryRegionMunicipality)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

type Collection = 'delivery_regions' | 'residue_collection_regions';

export async function addMunicipality(col: Collection, name: string, region: RegionKey, actorId: string) {
  const id = slugify(name);
  await setDoc(doc(db, col, id), {
    name: name.trim(),
    normalizedName: normalizeName(name),
    region,
    state: 'RJ',
    active: true,
    updatedAt: serverTimestamp(),
    updatedBy: actorId,
  });
}

export async function updateMunicipality(
  col: Collection,
  id: string,
  patch: Partial<Pick<DeliveryRegionMunicipality, 'region' | 'active'>>,
  actorId: string,
) {
  await updateDoc(doc(db, col, id), { ...patch, updatedAt: serverTimestamp(), updatedBy: actorId });
}
