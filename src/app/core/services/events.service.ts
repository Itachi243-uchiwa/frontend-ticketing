import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Event, CreateEventDto, EventStatus } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private api = inject(ApiService);

  getAll(page: number = 1, limit: number = 10, status?: EventStatus): Observable<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params: any = { page, limit };
    if (status) params.status = status;
    return this.api.get('events', params);
  }

  getMyEvents(page: number = 1, limit: number = 10): Observable<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get('events/my-events', { page, limit });
  }

  getUpcoming(limit: number = 10): Observable<Event[]> {
    return this.api.get('events/upcoming', { limit });
  }

  search(query: string, limit: number = 10): Observable<Event[]> {
    return this.api.get('events/search', { q: query, limit });
  }

  getById(id: string): Observable<Event> {
    return this.api.get(`events/${id}`);
  }

  getBySlug(slug: string): Observable<Event> {
    return this.api.get(`events/slug/${slug}`);
  }

  create(data: CreateEventDto): Observable<Event> {
    return this.api.post('events', data);
  }

  update(id: string, data: Partial<CreateEventDto>): Observable<Event> {
    return this.api.patch(`events/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete(`events/${id}`);
  }

  publish(id: string): Observable<Event> {
    return this.api.post(`events/${id}/publish`, {});
  }

  unpublish(id: string): Observable<Event> {
    return this.api.post(`events/${id}/unpublish`, {});
  }

  cancel(id: string): Observable<Event> {
    return this.api.post(`events/${id}/cancel`, {});
  }
}
