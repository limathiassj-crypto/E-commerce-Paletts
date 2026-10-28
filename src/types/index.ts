import type { Timestamp } from 'firebase/firestore';

export type Role = 'customer' | 'seller' | 'admin';
export type AccountType = 'customer' | 'supplier';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  accountTypes: AccountType[];
  role?: Role;
  acceptedTermsAt: Timestamp;
  acceptedPrivacyAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  widthM: number;
  lengthM: number;
  dimensionsLabel: string;
  description: string;
  photos: string[];
  /** Ainda não informado: a loja opera em modo "Solicitar orçamento". */
  price: number | null;
  saleUnit: string;
  stock: number | null;
  available: boolean;
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  dimensionsLabel: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  updatedAt?: Timestamp;
}

export interface DeliveryInfo {
  cep: string;
  municipality: string;
  state: string;
  neighborhood: string;
  address?: string;
}

export type DeliveryCoverage = 'covered' | 'not_covered' | 'unchecked';

export type QuoteStatus =
  | 'submitted'
  | 'in_review'
  | 'info_requested'
  | 'in_negotiation'
  | 'proposal_sent'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export interface Quote {
  id: string;
  userId: string;
  organizationId: string;
  items: CartItem[];
  delivery: DeliveryInfo;
  deliveryCoverage: DeliveryCoverage;
  notes?: string;
  status: QuoteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  internalNotes?: string;
}

export type ResidueStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'info_requested'
  | 'in_negotiation'
  | 'proposal_sent'
  | 'accepted'
  | 'declined'
  | 'awaiting_pickup'
  | 'completed'
  | 'cancelled';

export interface ResidueOffer {
  id: string;
  userId: string;
  organizationId: string;
  contactName: string;
  companyName: string;
  cnpj?: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  material: string;
  approximateQuantity: number;
  unit: string;
  frequency: string;
  condition: string;
  photos: string[];
  notes?: string;
  logisticsPreference?: string;
  status: ResidueStatus;
  proposedPrice?: number;
  approvedQuantity?: number;
  transportConditions?: string;
  evaluation?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HistoryEntry {
  id: string;
  actorId: string;
  action: string;
  note?: string;
  createdAt: Timestamp;
}

export type RegionKey = 'serrana' | 'baixada_fluminense' | 'lagos';

export interface DeliveryRegionMunicipality {
  id: string;
  name: string;
  normalizedName: string;
  region: RegionKey;
  state: 'RJ';
  active: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  reason: string;
  subject: string;
  message: string;
  userId: string | null;
  status: 'new' | 'read' | 'answered';
  createdAt: Timestamp;
}

export const REGION_LABELS: Record<RegionKey, string> = {
  serrana: 'Região Serrana',
  baixada_fluminense: 'Baixada Fluminense',
  lagos: 'Região dos Lagos / Baixadas Litorâneas',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: 'Enviado',
  in_review: 'Em análise',
  info_requested: 'Informações adicionais solicitadas',
  in_negotiation: 'Em negociação',
  proposal_sent: 'Proposta enviada',
  accepted: 'Aceito',
  declined: 'Recusado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const RESIDUE_STATUS_LABELS: Record<ResidueStatus, string> = {
  draft: 'Rascunho',
  submitted: 'Enviado',
  in_review: 'Em análise',
  info_requested: 'Informações adicionais solicitadas',
  in_negotiation: 'Em negociação',
  proposal_sent: 'Proposta enviada',
  accepted: 'Aceito',
  declined: 'Recusado',
  awaiting_pickup: 'Aguardando retirada ou entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};
