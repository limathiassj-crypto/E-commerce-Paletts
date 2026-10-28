/** Remove acentos, espaços repetidos e diferenças de caixa. Usado só para comparar; exiba sempre a grafia oficial. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function formatDimensions(widthM: number, lengthM: number): string {
  const f = (n: number) => n.toFixed(2).replace('.', ',');
  return `${f(widthM)} × ${f(lengthM)} m`;
}

export function slugify(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function isValidCep(value: string): boolean {
  return /^\d{5}-?\d{3}$/.test(value);
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}
