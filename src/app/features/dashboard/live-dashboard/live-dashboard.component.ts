import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { SocketService } from '../../../core/services/socket.service';
import { EventsService } from '../../../core/services/events.service';
import { Alert, EntriesFlow, LiveStats } from '../../../core/models/analytics.model';
import { Event } from '../../../core/models/event.model';


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

  // ─── Dimensions SVG du graphique ────────────────────────────────────────
  readonly chartW = 480;
  readonly chartH = 200;
  readonly padLeft = 48;
  readonly padRight = 12;
  readonly padTop = 16;
  readonly padBottom = 28;

  get plotW(): number { return this.chartW - this.padLeft - this.padRight; }
  get plotH(): number { return this.chartH - this.padTop - this.padBottom; }

  // ─── Computed ────────────────────────────────────────────────────────────
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
    const list = this.alerts();
    if (!Array.isArray(list)) return 0;
    return list.filter(a => !a.acknowledged).length;
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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

  // ─── Data loading ─────────────────────────────────────────────────────
  private loadEvent(): void {
    this.eventsService.getById(this.eventId).subscribe({
      next: (response: any) => {
        this.event.set(response?.data || response);
      },
      error: () => this.router.navigate(['/events'])
    });
  }

  private loadInitialData(): void {
    this.analyticsService.getDashboard(this.eventId).subscribe({
      next: (response: any) => {
        const data = response?.data || response;

        this.stats.set(data?.liveStats ?? null);
        this.entriesFlow.set(data?.entriesFlow ?? null);
        const rawAlerts = data?.alerts;
        this.alerts.set(Array.isArray(rawAlerts) ? rawAlerts : []);
        this.loading.set(false);
        this.lastUpdate.set(new Date());

        // Si entriesFlow est vide, essayer de le charger séparément
        if (!data?.entriesFlow?.data?.length) {
          this.loadEntriesFlow();
        }
      },
      error: (err) => {
        console.error('❌ Erreur getDashboard:', err);
        this.loadStats();
        this.loadAlerts();
        this.loadEntriesFlow();
      }
    });
  }

  loadStats(): void {
    this.analyticsService.getLiveStats(this.eventId).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.stats.set(data);
          this.lastUpdate.set(new Date());
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  loadAlerts(): void {
    this.analyticsService.getAlerts(this.eventId).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        const rawAlerts = data?.alerts ?? data;
        this.alerts.set(Array.isArray(rawAlerts) ? rawAlerts : []);
      }
    });
  }

  loadEntriesFlow(): void {
    // Si l'API a un endpoint séparé pour les entrées flow
    this.analyticsService.getEntriesFlow?.(this.eventId).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        this.entriesFlow.set(data);
      },
      error: (err) => console.error('❌ Erreur loadEntriesFlow:', err)
    });
  }

  private setupWebSocket(): void {
    this.socketService.connect().then(() => {
      this.socketService.joinEvent(this.eventId);

      this.unsubscribers.push(
        this.socketService.on('stats_update', (payload: any) => {
          const data = payload?.data || payload;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            this.stats.set(data);
            this.lastUpdate.set(new Date());
          }
        })
      );
      this.unsubscribers.push(
        this.socketService.on('ticket_scanned', () => this.loadStats())
      );
      this.unsubscribers.push(
        this.socketService.on('ticket_sold', () => this.loadStats())
      );
      this.unsubscribers.push(
        this.socketService.on('alert', (alert: Alert) => {
          this.alerts.update(current => [alert, ...(Array.isArray(current) ? current : [])]);
        })
      );
    });

    this.socketService.startPollingIfDisconnected(this.eventId, () => this.loadStats(), 15000);
  }

  // ─── Actions UI ───────────────────────────────────────────────────────
  refreshData(): void { this.loadInitialData(); }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
    if (this.isFullscreen()) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  acknowledgeAlert(alertId: string): void {
    this.alerts.update(alerts => alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      capacity: '⚠️', fraud: '🚨', attendance: '📊', traffic: '🔥', info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  formatTime(timestamp: number | Date): string {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // ─── Données du graphique ─────────────────────────────────────────────
  getFlowBars(): { label: string; value: number }[] {
    const flow = this.entriesFlow();

    if (!flow?.data?.length) {
      console.warn('⚠️ Pas de données flow disponibles');
      return [];
    }

    const bars = flow.data.slice(-12).map((d: any) => {
      const parsedValue = typeof d.count === 'number' ? d.count : parseInt(d.count || '0', 10);
      return {
        label: new Date(d.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        value: parsedValue
      };
    });

    return bars;
  }

  getFlowTotal(): number {
    return this.getFlowBars().reduce((sum, b) => sum + b.value, 0);
  }

  // ─── Méthodes SVG ─────────────────────────────────────────────────────

  getSvgViewBox(): string {
    return `0 0 ${this.chartW} ${this.chartH}`;
  }

  /** Valeur max pour l'axe Y */
  private getMaxValue(): number {
    const bars = this.getFlowBars();
    return Math.max(...bars.map(b => b.value), 1);
  }

  /** Coordonnée X d'un point d'indice i */
  getPointX(i: number): number {
    const bars = this.getFlowBars();
    if (bars.length <= 1) return this.padLeft + this.plotW / 2;
    return this.padLeft + (i / (bars.length - 1)) * this.plotW;
  }

  /** Coordonnée Y d'une valeur */
  getPointY(value: number): number {
    const max = this.getMaxValue();
    return this.padTop + this.plotH - (value / max) * this.plotH;
  }

  /** Lignes de grille horizontales (4 lignes) */
  getGridLines(): { y: number; value: number; label: string }[] {
    const max = this.getMaxValue();
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((max / steps) * i);
      return {
        y: this.getPointY(value),
        value,
        label: value > 0 ? value.toString() : '0'
      };
    }).reverse();
  }

  /** Path SVG de la courbe (cubic bezier pour lisser) */
  getLinePath(): string {
    const bars = this.getFlowBars();
    if (bars.length === 0) return '';
    if (bars.length === 1) {
      const x = this.getPointX(0);
      const y = this.getPointY(bars[0].value);
      return `M ${x},${y}`;
    }

    let d = `M ${this.getPointX(0)},${this.getPointY(bars[0].value)}`;
    for (let i = 1; i < bars.length; i++) {
      const x0 = this.getPointX(i - 1), y0 = this.getPointY(bars[i - 1].value);
      const x1 = this.getPointX(i),     y1 = this.getPointY(bars[i].value);
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
    return d;
  }

  /** Path SVG de la zone remplie (même courbe + fermeture vers le bas) */
  getAreaPath(): string {
    const bars = this.getFlowBars();
    if (bars.length === 0) return '';
    const baseline = this.chartH - this.padBottom;
    const linePath = this.getLinePath();
    const firstX = this.getPointX(0);
    const lastX  = this.getPointX(bars.length - 1);
    return `${linePath} L ${lastX},${baseline} L ${firstX},${baseline} Z`;
  }

  /** Afficher un label X (tous les 2 points sauf le dernier) */
  shouldShowXLabel(i: number): boolean {
    const bars = this.getFlowBars();
    return i === 0 || i === bars.length - 1 || i % 2 === 0;
  }

  /** Transform du tooltip pour rester dans le viewBox */
  getTooltipTransform(i: number, value: number): string {
    const bars = this.getFlowBars();
    const x = this.getPointX(i);
    const y = this.getPointY(value);

    // Décaler vers le bas si le point est trop haut
    const dy = y < 50 ? 50 : 0;
    // Décaler vers la droite/gauche si sur les bords
    const dx = i === 0 ? 36 : i === bars.length - 1 ? -36 : 0;

    return `translate(${x + dx}, ${y + dy})`;
  }
}
