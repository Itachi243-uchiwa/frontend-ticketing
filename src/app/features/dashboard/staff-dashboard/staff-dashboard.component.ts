import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { StaffService } from '../../../core/services/staff.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { catchError, forkJoin, of } from 'rxjs';

interface StaffStats {
  ticketsScannedToday: number;
  activeEvents: number;
  totalParticipants: number;
}

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './staff-dashboard.component.html',
  styleUrl: './staff-dashboard.component.css'
})
export class StaffDashboardComponent implements OnInit {
  private state = inject(StateService);
  private staffService = inject(StaffService);
  private platformId = inject(PLATFORM_ID);

  user = this.state.user;
  loading = signal(true);

  assignedEvents = signal<any[]>([]);

  stats = signal<StaffStats>({
    ticketsScannedToday: 0,
    activeEvents: 0,
    totalParticipants: 0
  });

  statsDisplay = [
    { label: "Billets scannés aujourd'hui", value: '0', icon: '✅', color: '#22c55e' },
    { label: 'Événements assignés',          value: '0', icon: '📊', color: '#3b82f6' },
    { label: 'Participants présents',         value: '0', icon: '👥', color: '#a855f7' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.loadStaffData();
  }

  private loadStaffData(): void {
    this.loading.set(true);

    this.staffService.getAssignedEvents(1, 20).pipe(
      catchError(() => of({ events: [], total: 0, page: 1, limit: 20 }))
    ).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const eventsList = dataContainer?.events || [];
        const events = Array.isArray(eventsList) ? eventsList : [];
        this.assignedEvents.set(events);

        if (events.length === 0) {
          // Aucun événement assigné — utiliser getMyStats() comme source globale
          this.loadMyStatsFallback();
          return;
        }

        // ✅ Tenter getEventStats() par événement (route ajoutée dans staff.controller.ts)
        // Si 404 backend pas encore déployé, catchError → null → forkJoin continue sans crash
        const statsRequests = events.map((event: any) =>
          this.staffService.getEventStats(event.id).pipe(catchError(() => of(null)))
        );

        forkJoin(statsRequests).subscribe({
          next: (allStats: any[]) => {
            // ✅ Si TOUS les appels ont échoué (route 404) → fallback getMyStats
            const allFailed = allStats.every((s) => s === null);
            if (allFailed) {
              this.loadMyStatsFallback();
              return;
            }

            let totalScanned = 0;
            let totalParticipants = 0;
            allStats.forEach((res: any) => {
              if (res) {
                const s = res?.data || res;
                totalScanned      += s?.ticketsScanned ?? s?.scannedTickets ?? 0;
                totalParticipants += s?.totalTickets   ?? 0;
              }
            });

            this.updateStats(totalScanned, totalParticipants);
            this.loading.set(false);
          },
          error: () => this.loadMyStatsFallback()
        });
      },
      error: () => {
        this.assignedEvents.set([]);
        this.loadMyStatsFallback();
      }
    });
  }

  /**
   * ✅ Fallback — GET /staff/my-stats (route existante, pas bloquée par ad-blockers)
   * Activé si getEventStats() renvoie 404 (avant déploiement backend)
   */
  private loadMyStatsFallback(): void {
    this.staffService.getMyStats().pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        const scanned      = data?.ticketsScannedToday ?? data?.ticketsScanned ?? 0;
        const participants = data?.totalParticipants   ?? data?.totalTickets   ?? 0;
        this.updateStats(scanned, participants);
        this.loading.set(false);
      },
      error: () => {
        this.updateStats(0, 0);
        this.loading.set(false);
      }
    });
  }

  private updateStats(totalScanned = 0, totalParticipants = 0): void {
    const events = this.assignedEvents();
    const updatedStats: StaffStats = {
      ticketsScannedToday: totalScanned,
      activeEvents: events.length,
      totalParticipants: totalParticipants,
    };
    this.stats.set(updatedStats);
    this.statsDisplay = [
      { label: 'Billets scannés',     value: updatedStats.ticketsScannedToday.toString(), icon: '✅', color: '#22c55e' },
      { label: 'Événements assignés', value: updatedStats.activeEvents.toString(),         icon: '📊', color: '#3b82f6' },
      { label: 'Participants totaux', value: updatedStats.totalParticipants.toString(),    icon: '👥', color: '#a855f7' },
    ];
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  getAttendanceRate(): number {
    const currentStats = this.stats();
    if (!currentStats.totalParticipants || currentStats.totalParticipants === 0) {
      return 0;
    }
    return Math.round((currentStats.ticketsScannedToday / currentStats.totalParticipants) * 100);
  }
}
