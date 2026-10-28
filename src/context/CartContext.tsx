import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loadCart, saveCart } from '@/services/orders';
import type { CartItem, Product } from '@/types';

const LS_KEY = 'multicaixas.cart.v1';

interface CartState {
  items: CartItem[];
  count: number;
  add: (p: Product, qty: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartState | null>(null);

function readLocal(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function merge(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  [...a, ...b].forEach((i) => {
    const prev = map.get(i.productId);
    map.set(i.productId, prev ? { ...prev, quantity: Math.max(prev.quantity, i.quantity) } : i);
  });
  return [...map.values()];
}

/** Persistência: localStorage para visitantes; Firestore (coleção carts) para usuários logados. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(readLocal);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    if (!user) {
      hydrated.current = true;
      return;
    }
    loadCart(user.uid)
      .then((remote) => setItems((local) => merge(remote, local)))
      .catch(() => undefined)
      .finally(() => {
        hydrated.current = true;
      });
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível */
    }
    if (user && hydrated.current) saveCart(user.uid, items).catch(() => undefined);
  }, [items, user]);

  const value: CartState = {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    add: (p, qty) =>
      setItems((cur) => {
        const found = cur.find((i) => i.productId === p.id);
        if (found) return cur.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + qty } : i));
        return [...cur, { productId: p.id, name: p.name, dimensionsLabel: p.dimensionsLabel, quantity: qty }];
      }),
    setQty: (id, qty) => setItems((cur) => cur.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, Math.floor(qty) || 1) } : i))),
    remove: (id) => setItems((cur) => cur.filter((i) => i.productId !== id)),
    clear: () => {
      setItems([]);
      localStorage.removeItem(LS_KEY);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart fora do CartProvider');
  return v;
}
