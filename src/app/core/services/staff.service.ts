import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';


@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private api = inject(ApiService);

  /**
   * Récupère les événements assignés au membre du staff connecté
   */
  getAssignedEvents(page: number = 1, limit: number = 10): Observable<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get('staff/assigned-events', { page, limit });
  }

  /**
   * Récupère un événement assigné spécifique
   */
  getAssignedEvent(eventId: string): Observable<Event> {
    return this.api.get(`staff/assigned-events/${eventId}`);
  }

  /**
   * Récupère les members staff de l'organisateur connecté
   */
  getMyStaff(page: number = 1, limit: number = 10): Observable<{
    users: User[];
    total: number;
  }> {
    return this.api.get('staff/my-staff', { page, limit });
  }

  /**
   * Récupère les staff assignés à un événement
   */
  getEventStaff(eventId: string): Observable<{
    staff: User[];
    total: number;
  }> {
    return this.api.get(`staff/events/${eventId}/members`);
  }

  /**
   * Récupère les assignations d'un staff
   */
  getStaffAssignments(staffId: string): Observable<any[]> {
    return this.api.get(`staff/${staffId}/assignments`);
  }

  /**
   * Assigner un staff à des événements supplémentaires
   */
  assignToEvents(staffId: string, eventIds: string[]): Observable<any> {
    return this.api.post(`staff/${staffId}/assign`, { eventIds });
  }

  /**
   * Désassigner un staff d'un événement
   */
  unassignFromEvent(staffId: string, eventId: string): Observable<void> {
    return this.api.delete(`staff/${staffId}/events/${eventId}`);
  }

  /**
   * Récupère les statistiques du staff pour un événement
   */
  getEventStats(eventId: string): Observable<{
    ticketsScanned: number;
    totalTickets: number;
    scanRate: number;
    lastScan?: Date;
  }> {
    return this.api.get(`staff/events/${eventId}/stats`);
  }

  /**
   * Récupère l'historique des scans du staff
   */
  getScanHistory(page: number = 1, limit: number = 20): Observable<{
    scans: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.api.get('staff/scan-history', { page, limit });
  }

  /**
   * Récupère les statistiques globales du staff
   */
  getMyStats(): Observable<{
    ticketsScannedToday: number;
    activeEvents: number;
    totalParticipants: number;
    totalScans: number;
  }> {
    return this.api.get('staff/my-stats');
  }
}
