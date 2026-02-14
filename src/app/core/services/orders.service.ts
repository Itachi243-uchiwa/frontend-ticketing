import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Order, CreateOrderDto } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private api = inject(ApiService);

  create(data: CreateOrderDto): Observable<Order> {
    return this.api.post('orders', data);
  }

  getAll(page: number = 1, limit: number = 10): Observable<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get('orders', { page, limit });
  }

  getMyOrders(page: number = 1, limit: number = 10): Observable<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get('orders/my-orders', { page, limit });
  }

  getEventOrders(eventId: string, page: number = 1, limit: number = 10): Observable<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get(`orders/events/${eventId}`, { page, limit });
  }

  getEventStats(eventId: string): Observable<{
    totalOrders: number;
    totalRevenue: number;
    ticketsSold: number;
  }> {
    return this.api.get(`orders/events/${eventId}/stats`);
  }

  getById(id: string): Observable<Order> {
    return this.api.get(`orders/${id}`);
  }

  getByOrderNumber(orderNumber: string): Observable<Order> {
    return this.api.get(`orders/number/${orderNumber}`);
  }

  cancel(id: string): Observable<Order> {
    return this.api.patch(`orders/${id}/cancel`, {});
  }

  confirmPayment(id: string, paymentMethod: string, paymentId: string): Observable<Order> {
    return this.api.patch(`orders/${id}/confirm-payment`, { paymentMethod, paymentId });
  }
}
