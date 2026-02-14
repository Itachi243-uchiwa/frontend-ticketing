import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { StaffService } from '../../../core/services/staff.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { catchError, of } from 'rxjs';

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

  // ✅ Événements assignés au staff (pas tous les événements)
  assignedEvents = signal<any[]>([]);

  // Stats du staff
  stats = signal<StaffStats>({
    ticketsScannedToday: 0,
    activeEvents: 0,
    totalParticipants: 0
  });

  statsDisplay = [
    { label: 'Billets scannés aujourd\'hui', value: '0', icon: '✅', color: 'bg-green-500' },
    { label: 'Événements assignés', value: '0', icon: '📊', color: 'bg-blue-500' },
    { label: 'Participants présents', value: '0', icon: '👥', color: 'bg-purple-500' },
  ];

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.loadStaffData();
  }

  private loadStaffData(): void {
    this.loading.set(true);

    // ✅ Utilise le endpoint staff/assigned-events (uniquement les events assignés)
    this.staffService.getAssignedEvents(1, 20).pipe(
      catchError(() => of({ events: [], total: 0, page: 1, limit: 20 }))
    ).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const eventsList = dataContainer?.events || [];
        this.assignedEvents.set(Array.isArray(eventsList) ? eventsList : []);

        this.updateStats();
        this.loading.set(false);
      },
      error: () => {
        this.assignedEvents.set([]);
        this.loading.set(false);
      }
    });
  }

  private updateStats(): void {
    const events = this.assignedEvents();

    const updatedStats: StaffStats = {
      ticketsScannedToday: 0,
      activeEvents: events.length,
      totalParticipants: 0
    };

    this.stats.set(updatedStats);

    this.statsDisplay = [
      {
        label: 'Billets scannés aujourd\'hui',
        value: updatedStats.ticketsScannedToday.toString(),
        icon: '✅',
        color: 'bg-green-500'
      },
      {
        label: 'Événements assignés',
        value: updatedStats.activeEvents.toString(),
        icon: '📊',
        color: 'bg-blue-500'
      },
      {
        label: 'Participants présents',
        value: updatedStats.totalParticipants.toString(),
        icon: '👥',
        color: 'bg-purple-500'
      },
    ];
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
