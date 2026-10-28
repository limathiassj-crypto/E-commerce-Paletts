import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category, Product } from '@/types';
import { formatDimensions, slugify } from '@/lib/normalize';

export async function listPublishedProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, 'products'), where('published', '==', true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product).sort(sortProducts);
}

/** Uso interno (equipe): inclui não publicados. */
export async function listAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product).sort(sortProducts);
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null;
}

export async function listCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function saveCategory(cat: { id?: string; name: string }) {
  const id = cat.id ?? slugify(cat.name);
  await setDoc(doc(db, 'categories', id), { name: cat.name.trim(), slug: id }, { merge: true });
}

export interface ProductInput {
  id?: string;
  name: string;
  categoryId: string;
  categoryName: string;
  widthM: number;
  lengthM: number;
  description: string;
  price: number | null;
  saleUnit: string;
  stock: number | null;
  available: boolean;
  published: boolean;
  photos: string[];
}

export async function saveProduct(input: ProductInput, actorId: string) {
  const id = input.id ?? `${slugify(input.name)}-${String(Math.round(input.widthM * 100))}x${String(Math.round(input.lengthM * 100))}`;
  const ref = doc(db, 'products', id);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      name: input.name.trim(),
      slug: id,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      widthM: input.widthM,
      lengthM: input.lengthM,
      dimensionsLabel: formatDimensions(input.widthM, input.lengthM),
      description: input.description,
      photos: input.photos,
      price: input.price,
      saleUnit: input.saleUnit,
      stock: input.stock,
      available: input.available,
      published: input.published,
      updatedAt: serverTimestamp(),
      updatedBy: actorId,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  return id;
}

function sortProducts(a: Product, b: Product) {
  return a.name.localeCompare(b.name, 'pt-BR') || a.widthM - b.widthM;
}
