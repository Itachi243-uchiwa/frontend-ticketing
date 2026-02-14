import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LiveStats, EntriesFlow, HeatmapData, Alert, DashboardData } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = inject(ApiService);

  getLiveStats(eventId: string): Observable<LiveStats> {
    return this.api.get(`analytics/events/${eventId}/live-stats`);
  }

  getEntriesFlow(eventId: string, minutes = 60): Observable<EntriesFlow> {
    return this.api.get(`analytics/events/${eventId}/entries-flow`, { minutes });
  }

  getHeatmap(eventId: string): Observable<HeatmapData> {
    return this.api.get(`analytics/events/${eventId}/heatmap`);
  }

  getAlerts(eventId: string): Observable<{ alerts: Alert[] }> {
    return this.api.get(`analytics/events/${eventId}/alerts`);
  }

  getDashboard(eventId: string): Observable<DashboardData> {
    return this.api.get(`analytics/events/${eventId}/dashboard`);
  }

  exportData(eventId: string): Observable<any> {
    return this.api.get(`analytics/events/${eventId}/export`);
  }
}
