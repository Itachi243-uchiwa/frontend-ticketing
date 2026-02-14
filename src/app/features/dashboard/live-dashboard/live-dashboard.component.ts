import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {AnalyticsService} from '../../../core/services/analytics.service';
import {SocketService} from '../../../core/services/socket.service';
import {EventsService} from '../../../core/services/events.service';
import {Alert, EntriesFlow, LiveStats} from '../../../core/models/analytics.model';
import {Event} from '../../../core/models/event.model';


@Component({
  selector: 'app-live-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './live-dashboard.component.html',
  styleUrl: './live-dashboard.component.css'
})
export class LiveDashboardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private socketService = inject(SocketService);
  private eventsService = inject(EventsService);
  private platformId = inject(PLATFORM_ID);

  event = signal<Event | null>(null);
  stats = signal<LiveStats | null>(null);
  entriesFlow = signal<EntriesFlow | null>(null);
  alerts = signal<Alert[]>([]);
  loading = signal(true);
  isFullscreen = signal(false);
  lastUpdate = signal<Date>(new Date());

  private eventId = '';
  private unsubscribers: (() => void)[] = [];

  isConnected = this.socketService.isConnected;

  attendancePercent = computed(() => {
    const s = this.stats();
    if (!s || !s.totalTickets) return 0;
    return Math.round((s.ticketsScanned / s.totalTickets) * 100);
  });

  salesPercent = computed(() => {
    const s = this.stats();
    const e = this.event();
    if (!s || !e || !e.capacity) return 0;
    return Math.round((s.ticketsSold / e.capacity) * 100);
  });
  unacknowledgedAlertsCount = computed(() => {
    return this.alerts().filter(a => !a.acknowledged).length;
  });

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Support both route patterns: 'live-stats/:eventId' and 'events/:id/live'
    this.eventId = this.route.snapshot.params['eventId'] || this.route.snapshot.params['id'];

    if (!this.eventId) {
      console.error('❌ No eventId found in route params');
      this.router.navigate(['/events']);
      return;
    }

    this.loadEvent();
    this.loadInitialData();
    this.setupWebSocket();
  }

  ngOnDestroy(): void {
    this.unsubscribers.forEach(fn => fn());
    this.socketService.leaveEvent(this.eventId);
    this.socketService.stopPolling(this.eventId);
  }

  private loadEvent(): void {
    this.eventsService.getById(this.eventId).subscribe({
      next: (event) => this.event.set(event),
      error: () => this.router.navigate(['/events'])
    });
  }

  private loadInitialData(): void {
    this.analyticsService.getDashboard(this.eventId).subscribe({
      next: (data) => {
        this.stats.set(data.liveStats);
        this.entriesFlow.set(data.entriesFlow);
        this.alerts.set(data.alerts);
        this.loading.set(false);
        this.lastUpdate.set(new Date());
      },
      error: () => {
        // Fallback: load stats individually
        this.loadStats();
        this.loadAlerts();
      }
    });
  }

  loadStats(): void {
    this.analyticsService.getLiveStats(this.eventId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
        this.lastUpdate.set(new Date());
      }
    });
  }

  loadAlerts(): void {
    this.analyticsService.getAlerts(this.eventId).subscribe({
      next: (data) => this.alerts.set(data.alerts)
    });
  }

  private setupWebSocket(): void {
    this.socketService.connect().then(() => {
      this.socketService.joinEvent(this.eventId);

      // Listen for real-time events
      this.unsubscribers.push(
        this.socketService.on('stats_update', (data: LiveStats) => {
          this.stats.set(data);
          this.lastUpdate.set(new Date());
        })
      );

      this.unsubscribers.push(
        this.socketService.on('ticket_scanned', () => {
          // Refresh stats on scan
          this.loadStats();
        })
      );

      this.unsubscribers.push(
        this.socketService.on('ticket_sold', () => {
          this.loadStats();
        })
      );

      this.unsubscribers.push(
        this.socketService.on('alert', (alert: Alert) => {
          this.alerts.update(current => [alert, ...current]);
        })
      );
    });

    // Polling fallback
    this.socketService.startPolling(this.eventId, () => this.loadStats(), 15000);
  }

  refreshData(): void {
    this.loadInitialData();
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
    if (this.isFullscreen()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  acknowledgeAlert(alertId: string): void {
    this.alerts.update(alerts =>
      alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      capacity: '⚠️',
      fraud: '🚨',
      attendance: '📊',
      traffic: '🔥',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  getAlertColor(severity: string): string {
    const colors: Record<string, string> = {
      low: 'border-blue-300 bg-blue-50',
      medium: 'border-yellow-300 bg-yellow-50',
      high: 'border-orange-300 bg-orange-50',
      critical: 'border-red-300 bg-red-50'
    };
    return colors[severity] || 'border-gray-300 bg-gray-50';
  }

  formatTime(timestamp: number | Date): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Get entries flow data for simple chart rendering
  getFlowBars(): { label: string; value: number; maxValue: number }[] {
    const flow = this.entriesFlow();
    if (!flow?.data?.length) return [];
    const maxCount = Math.max(...flow.data.map(d => d.count), 1);
    return flow.data.slice(-12).map(d => ({
      label: d.minute,
      value: d.count,
      maxValue: maxCount
    }));
  }
}
