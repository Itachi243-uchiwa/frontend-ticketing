import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { OrdersService } from '../../../core/services/orders.service';
import { Event, EventStatus } from '../../../core/models/event.model';
import { TicketType } from '../../../core/models/ticket.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { TicketManagementComponent } from '../ticket-management/ticket-management.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TicketManagementComponent],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventsService = inject(EventsService);
  private ticketsService = inject(TicketsService);
  private ordersService = inject(OrdersService);
  private platformId = inject(PLATFORM_ID);

  event = signal<Event | null>(null);
  tickets = signal<TicketType[]>([]);
  stats = signal<any>({ ticketsSold: 0, totalRevenue: 0, totalOrders: 0 });
  loading = signal(true);

  activeTab = signal<'overview' | 'tickets' | 'orders'>('overview');

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const eventId = this.route.snapshot.params['id'];
    if (eventId) {
      this.loadEvent(eventId);
      this.loadTickets(eventId);
      this.loadStats(eventId);
    } else {
      this.router.navigate(['/events']);
    }
  }

  loadEvent(id: string): void {
    this.eventsService.getById(id).subscribe({
      next: (response: any) => {
        const eventData = response?.data || response;
        this.event.set(eventData);
        this.loading.set(false);
      },
      error: () => this.router.navigate(['/events'])
    });
  }

  loadTickets(eventId: string): void {
    this.ticketsService.getByEventId(eventId).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const ticketsList = Array.isArray(dataContainer) ? dataContainer : (dataContainer?.tickets || []);
        this.tickets.set(Array.isArray(ticketsList) ? ticketsList : []);
      },
      error: () => this.tickets.set([])
    });
  }

  loadStats(eventId: string): void {
    this.ordersService.getEventStats(eventId).subscribe({
      next: (response: any) => this.stats.set(response?.data || response),
      error: (err) => { if (err.status !== 404) console.error(err); }
    });
  }

  publishEvent(): void {
    const event = this.event();
    if (!event) return;
    this.eventsService.publish(event.id).subscribe({
      next: (updated: any) => {
        const eventData = updated?.data || updated;
        this.event.set(eventData);
      },
      error: (err) => console.error('Erreur lors de la publication:', err)
    });
  }

  unpublishEvent(): void {
    const event = this.event();
    if (!event) return;
    this.eventsService.unpublish(event.id).subscribe({
      next: (updated: any) => {
        const eventData = updated?.data || updated;
        this.event.set(eventData);
      },
      error: (err) => console.error('Erreur lors de la dépublication:', err)
    });
  }

  cancelEvent(): void {
    const event = this.event();
    if (!event) return;
    if (!confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) return;
    this.eventsService.cancel(event.id).subscribe({
      next: (updated: any) => {
        const eventData = updated?.data || updated;
        this.event.set(eventData);
      },
      error: (err) => console.error('Erreur lors de l\'annulation:', err)
    });
  }

  deleteEvent(): void {
    const event = this.event();
    if (!event) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) return;
    this.eventsService.delete(event.id).subscribe({
      next: () => this.router.navigate(['/events']),
      error: (err) => console.error('Erreur lors de la suppression:', err)
    });
  }

  getStatusColor(status: EventStatus): string {
    const colors = {
      [EventStatus.DRAFT]: 'bg-gray-500',
      [EventStatus.PUBLISHED]: 'bg-green-500',
      [EventStatus.ONGOING]: 'bg-blue-500',
      [EventStatus.COMPLETED]: 'bg-purple-500',
      [EventStatus.CANCELLED]: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getPublicUrl(): string {
    const event = this.event();
    if (!event) return '';
    const slug = event.slug || event.id;
    return `${window.location.origin}/event/${slug}`;
  }

  copyPublicUrl(): void {
    const url = this.getPublicUrl();
    navigator.clipboard.writeText(url).then(() => { alert('Lien copié !'); });
  }
}
