import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { EventsService } from '../../../core/services/events.service';
import { StaffService } from '../../../core/services/staff.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { Event } from '../../../core/models/event.model';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './organizer-dashboard.component.html',
  styleUrl: './organizer-dashboard.component.css'
})
export class OrganizerDashboardComponent implements OnInit {
  private state = inject(StateService);
  private eventsService = inject(EventsService);
  private staffService = inject(StaffService);
  private platformId = inject(PLATFORM_ID);

  user = this.state.user;
  loading = signal(false);
  recentEvents = signal<Event[]>([]);

  stats = signal([
    { label: 'Mes Événements', value: '0', icon: '🎪', detail: 'Actifs', borderColor: '#4F46E5' },
    { label: 'Revenus Totaux', value: '€0', icon: '💰', detail: 'Ce mois', borderColor: '#10B981' },
    { label: 'Billets Vendus', value: '0', icon: '🎟️', detail: 'Total', borderColor: '#3B82F6' },
    { label: 'Mon Équipe Staff', value: '0', icon: '👥', detail: 'Membres actifs', borderColor: '#F59E0B' },
  ]);

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);

    this.eventsService.getMyEvents(1, 100).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const eventsList = Array.isArray(dataContainer) ? dataContainer : (dataContainer?.events || []);
        const totalEvents = dataContainer?.total || eventsList.length || 0;

        let totalRevenue = 0;
        let totalTicketsSold = 0;

        if (Array.isArray(eventsList)) {
          eventsList.forEach((event: any) => {
            totalRevenue += event.revenue || 0;
            totalTicketsSold += event.ticketsSold || 0;
          });
          this.recentEvents.set(eventsList.slice(0, 5));
        } else {
          this.recentEvents.set([]);
        }

        // ✅ Utilise /staff/my-staff (scopé à l'organisateur) au lieu de GET /users?role=STAFF
        this.staffService.getMyStaff(1, 100).subscribe({
          next: (staffResponse: any) => {
            const staffContainer = staffResponse?.data || staffResponse;
            const staffTotal = staffContainer?.total || 0;

            this.stats.set([
              { label: 'Mes Événements', value: totalEvents.toString(), icon: '🎪', detail: 'Actifs', borderColor: '#4F46E5' },
              { label: 'Revenus Totaux', value: `€${totalRevenue.toFixed(2)}`, icon: '💰', detail: 'Ce mois', borderColor: '#10B981' },
              { label: 'Billets Vendus', value: totalTicketsSold.toString(), icon: '🎟️', detail: 'Total', borderColor: '#3B82F6' },
              { label: 'Mon Équipe Staff', value: staffTotal.toString(), icon: '👥', detail: 'Membres actifs', borderColor: '#F59E0B' },
            ]);
            this.loading.set(false);
          },
          error: () => {
            this.stats.set([
              { label: 'Mes Événements', value: totalEvents.toString(), icon: '🎪', detail: 'Actifs', borderColor: '#4F46E5' },
              { label: 'Revenus Totaux', value: `€${totalRevenue.toFixed(2)}`, icon: '💰', detail: 'Ce mois', borderColor: '#10B981' },
              { label: 'Billets Vendus', value: totalTicketsSold.toString(), icon: '🎟️', detail: 'Total', borderColor: '#3B82F6' },
              { label: 'Mon Équipe Staff', value: '0', icon: '👥', detail: 'Membres actifs', borderColor: '#F59E0B' },
            ]);
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
