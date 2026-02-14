import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { OrdersService } from '../../../core/services/orders.service';
import { EventsService } from '../../../core/services/events.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-participant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './participant-dashboard.component.html',
  styleUrl: './participant-dashboard.component.css'
})
export class ParticipantDashboardComponent implements OnInit {
  private state = inject(StateService);
  private ordersService = inject(OrdersService);
  private eventsService = inject(EventsService);
  private platformId = inject(PLATFORM_ID);

  user = this.state.user;
  loading = signal(true);

  // Événements publics à venir (pas les événements de l'organisateur)
  upcomingEvents = signal<any[]>([]);
  // Commandes du participant
  recentOrders = signal<any[]>([]);
  // Total de billets achetés
  totalTickets = signal(0);

  stats = computed(() => [
    {
      label: 'Mes Billets',
      value: (this.totalTickets() ?? 0).toString(),
      icon: '🎟️',
      color: 'bg-indigo-500'
    },
    {
      label: 'Événements à venir',
      value: (this.upcomingEvents()?.length ?? 0).toString(),
      icon: '🌍',
      color: 'bg-emerald-500'
    },
    {
      label: 'Mes Commandes',
      value: (this.recentOrders()?.length ?? 0).toString(),
      icon: '📦',
      color: 'bg-amber-500'
    },
  ]);

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading.set(true);

    forkJoin({
      // Événements publics à venir (pas mes événements créés)
      publicEvents: this.eventsService.getUpcoming(6).pipe(catchError(() => of([]))),
      // Mes commandes
      myOrders: this.ordersService.getMyOrders(1, 5).pipe(catchError(() => of({ orders: [], total: 0 })))
    }).subscribe({
      next: (res: any) => {
        // Événements publics
        const publicEventsData = res.publicEvents?.data || res.publicEvents || [];
        this.upcomingEvents.set(Array.isArray(publicEventsData) ? publicEventsData : []);

        // Commandes
        const ordersData = res.myOrders?.data || res.myOrders;
        const orders = ordersData?.orders || ordersData || [];
        this.recentOrders.set(Array.isArray(orders) ? orders : []);

        // Total de billets (somme des quantités dans les commandes)
        const totalTickets = Array.isArray(orders)
          ? orders.reduce((sum: number, order: any) => {
            const items = order.items || [];
            return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
          }, 0)
          : 0;
        this.totalTickets.set(totalTickets);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur chargement dashboard participant:', error);
        this.loading.set(false);
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getOrderStatus(status: string): { label: string; color: string } {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PENDING': { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      'CONFIRMED': { label: 'Confirmé', color: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'Annulé', color: 'bg-red-100 text-red-800' },
      'PAID': { label: 'Payé', color: 'bg-blue-100 text-blue-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  }
}
