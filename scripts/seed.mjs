// Popula categorias, os 7 produtos iniciais e os 41 municípios de entrega (Firestore real).
// Uso:  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seed.mjs
// Nunca versione a chave de serviço (já está no .gitignore).
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const data = JSON.parse(readFileSync(new URL('../src/data/seed-data.json', import.meta.url), 'utf8'));

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const normalize = (v) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const slugify = (v) => normalize(v).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const fmt = (n) => n.toFixed(2).replace('.', ',');

const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));
const batch = db.batch();

for (const c of data.categories) {
  batch.set(db.doc(`categories/${c.id}`), { name: c.name, slug: c.slug });
}

for (const p of data.products) {
  batch.set(db.doc(`products/${p.id}`), {
    name: p.name,
    slug: p.id,
    categoryId: p.categoryId,
    categoryName: catName[p.categoryId],
    widthM: p.widthM,
    lengthM: p.lengthM,
    dimensionsLabel: `${fmt(p.widthM)} × ${fmt(p.lengthM)} m`,
    description: `${p.name}, dimensões ${fmt(p.widthM)} × ${fmt(p.lengthM)} m. Especificações técnicas adicionais sob consulta com a equipe comercial.`,
    photos: [],
    price: null, // preço ainda não informado: modo "Solicitar orçamento"
    saleUnit: 'unidade',
    stock: null,
    available: true,
    published: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed',
  });
}

let municipalities = 0;
for (const [region, names] of Object.entries(data.deliveryRegions)) {
  for (const name of names) {
    batch.set(db.doc(`delivery_regions/${slugify(name)}`), {
      name,
      normalizedName: normalize(name),
      region,
      state: 'RJ',
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed',
    });
    municipalities++;
  }
}

batch.set(
  db.doc('app_settings/public'),
  {
    companyName: 'Multicaixas e Embalagens',
    headquarters: 'São José do Vale do Rio Preto, RJ',
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

await batch.commit();
console.log(`OK: ${data.categories.length} categorias, ${data.products.length} produtos, ${municipalities} municípios.`);
