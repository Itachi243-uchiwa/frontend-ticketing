import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TicketType, CreateTicketTypeDto, Ticket } from '../models/ticket.model';
import { environment } from '../../../environnements/environment';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Ticket Types
  getByEventId(eventId: string): Observable<TicketType[]> {
    return this.api.get(`events/${eventId}/tickets`);
  }

  getAvailableByEventId(eventId: string): Observable<TicketType[]> {
    return this.api.get(`events/${eventId}/tickets/available`);
  }

  getById(eventId: string, id: string): Observable<TicketType> {
    return this.api.get(`events/${eventId}/tickets/${id}`);
  }

  create(eventId: string, data: CreateTicketTypeDto): Observable<TicketType> {
    return this.api.post(`events/${eventId}/tickets`, data);
  }

  update(eventId: string, id: string, data: Partial<CreateTicketTypeDto>): Observable<TicketType> {
    return this.api.patch(`events/${eventId}/tickets/${id}`, data);
  }

  delete(eventId: string, id: string): Observable<void> {
    return this.api.delete(`events/${eventId}/tickets/${id}`);
  }

  // ✅ FIX: Utiliser 'me' comme eventId placeholder
  getMyTickets(): Observable<Ticket[]> {
    return this.api.get('events/me/tickets/me');
  }

  getTicketsByOrder(eventId: string, orderId: string): Observable<Ticket[]> {
    return this.api.get(`events/${eventId}/tickets/orders/${orderId}`);
  }

  getTicketsByEvent(eventId: string): Observable<Ticket[]> {
    return this.api.get(`events/${eventId}/tickets/events/${eventId}`);
  }

  generateTickets(eventId: string, orderId: string): Observable<Ticket[]> {
    return this.api.post(`events/${eventId}/tickets/orders/${orderId}/generate`, {});
  }

  cancelTicket(eventId: string, ticketId: string): Observable<Ticket> {
    return this.api.patch(`events/${eventId}/tickets/${ticketId}/cancel`, {});
  }

  resendTicket(eventId: string, ticketId: string): Observable<void> {
    return this.api.post(`events/${eventId}/tickets/${ticketId}/resend`, {});
  }

  getEventTicketStats(eventId: string): Observable<any> {
    return this.api.get(`events/${eventId}/tickets/events/${eventId}/stats`);
  }

  downloadTicketsPdf(eventId: string, orderId: string): Observable<{ blob: Blob; filename: string }> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    const url = `${this.baseUrl}/events/${eventId}/tickets/orders/${orderId}/download`;

    return new Observable(observer => {
      this.http.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        observe: 'response',
      }).subscribe({
        next: (response) => {
          const blob = response.body!;
          const contentDisposition = response.headers.get('Content-Disposition') || '';
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          const filename = match?.[1] || `billets-${orderId}.pdf`;
          observer.next({ blob, filename });
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}
