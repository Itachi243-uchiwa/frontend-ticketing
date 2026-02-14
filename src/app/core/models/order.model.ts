import { TicketType } from './ticket.model';
import { User } from './user.model';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED'
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  ticketType: TicketType;
  ticketTypeId: string;
  orderId: string;
  createdAt: Date;
}
export interface EventSummary {
  id: string;
  name: string;
  startDate: Date | string;
  location: string;
  organizerId: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  paymentId?: string;
  paidAt?: Date;
  promoCode?: string;
  userId: string;
  user?: User;
  eventId: string;
  event?: EventSummary;
  items: OrderItem[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDto {
  eventId: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  promoCode?: string;
}
