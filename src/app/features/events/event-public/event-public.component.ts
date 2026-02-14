import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/services/auth.service';
import { Event } from '../../../core/models/event.model';
import { TicketType } from '../../../core/models/ticket.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-event-public',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-public.component.html',
  styleUrl: './event-public.component.css'
})
export class EventPublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventsService = inject(EventsService);
  private ticketsService = inject(TicketsService);
  private ordersService = inject(OrdersService);
  private authService = inject(AuthService);

  event = signal<Event | null>(null);
  tickets = signal<TicketType[]>([]);
  cart = signal<Map<string, number>>(new Map());
  loading = signal(true);
  isProcessingOrder = signal(false);

  totalPrice = computed(() => {
    let total = 0;
    this.cart().forEach((quantity, ticketId) => {
      const ticket = this.tickets().find(t => t.id === ticketId);
      if (ticket) {
        total += ticket.price * quantity;
      }
    });
    return total;
  });

  totalQuantity = computed(() => {
    let total = 0;
    this.cart().forEach(quantity => total += quantity);
    return total;
  });

  isAuthenticated = computed(() => this.authService.isAuthenticated());

  ngOnInit(): void {
    const slug = this.route.snapshot.params['slug'];
    if (slug) {
      this.loadEvent(slug);
    } else {
      this.router.navigate(['/']);
    }
  }

  loadEvent(slug: string): void {
    this.eventsService.getBySlug(slug).subscribe({
      next: (response: any) => {
        // ✅ CORRECTION : Extraction sécurisée de l'événement
        // L'API renvoie souvent { data: { ... } } pour un item unique
        const eventData = response?.data || response;

        console.log('📅 Événement chargé:', eventData);

        if (eventData) {
          this.event.set(eventData);
          // On utilise l'ID extrait pour charger les tickets
          if (eventData.id) {
            this.loadTickets(eventData.id);
          }
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Erreur chargement événement:', err);
        this.router.navigate(['/']);
      }
    });
  }

  loadTickets(eventId: string): void {
    this.ticketsService.getAvailableByEventId(eventId).subscribe({
      next: (response: any) => {
        // ✅ CORRECTION : Extraction sécurisée du tableau de tickets
        // L'API peut renvoyer { data: [...] } ou directement [...]
        const dataContainer = response?.data || response;

        // Si dataContainer est un objet contenant encore 'data' (cas rare mais possible), on descend encore
        const ticketsList = Array.isArray(dataContainer) ? dataContainer : (dataContainer?.tickets || []);

        console.log('🎫 Tickets publics chargés:', ticketsList);

        if (Array.isArray(ticketsList)) {
          this.tickets.set(ticketsList);
        } else {
          // Fallback : tableau vide pour éviter le crash du .find() ou du @for
          this.tickets.set([]);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement tickets:', err);
        this.tickets.set([]);
        this.loading.set(false);
      }
    });
  }

  addToCart(ticket: any) {
    const current = this.cart().get(ticket.id) || 0;
    const available = ticket.quantity - ticket.sold;
    const max = ticket.maxPerOrder ?? available;

    if (current < available && current < max) {
      const updated = new Map(this.cart());
      updated.set(ticket.id, current + 1);
      this.cart.set(updated);
    }
  }

  removeFromCart(ticketId: string): void {
    const current = this.cart().get(ticketId) || 0;
    const ticket = this.tickets().find(t => t.id === ticketId);
    const min = ticket?.minPerOrder || 0;

    if (current > min) {
      if (current === 1) {
        this.cart().delete(ticketId);
      } else {
        this.cart().set(ticketId, current - 1);
      }
      this.cart.set(new Map(this.cart()));
    }
  }

  setQuantity(ticketId: string, quantity: number): void {
    const ticket = this.tickets().find(t => t.id === ticketId);
    if (!ticket) return;

    const min = ticket.minPerOrder || 0;
    const max = Math.min(
      ticket.maxPerOrder || 999,
      ticket.available !== undefined ? ticket.available : 999
    );

    if (quantity >= min && quantity <= max) {
      if (quantity === 0) {
        this.cart().delete(ticketId);
      } else {
        this.cart().set(ticketId, quantity);
      }
      this.cart.set(new Map(this.cart()));
    }
  }

  proceedToCheckout(): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const items: any[] = [];
    this.cart().forEach((quantity, ticketId) => {
      if (quantity > 0) {
        items.push({ ticketTypeId: ticketId, quantity });
      }
    });

    if (items.length === 0) return;

    const event = this.event();
    if (!event) return;

    this.isProcessingOrder.set(true);

    this.ordersService.create({
      eventId: event.id,
      items
    }).subscribe({
      next: (response: any) => {
        // Sécurisation de la réponse commande également
        const order = response?.data || response;
        console.log('📦 Commande créée:', order);

        if (order && order.id) {
          this.router.navigate(['/checkout', order.id]);
        } else {
          console.error('❌ ID de commande manquant dans la réponse:', response);
          alert('Erreur: ID de commande manquant');
          this.isProcessingOrder.set(false);
        }
      },
      error: (error) => {
        console.error('❌ Erreur création commande:', error);
        alert(error.error?.message || 'Erreur lors de la création de la commande');
        this.isProcessingOrder.set(false);
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeUntilEvent(): string {
    const event = this.event();
    if (!event || !event.startDate) return '';

    const now = new Date().getTime();
    const start = new Date(event.startDate).getTime();
    const diff = start - now;

    if (diff <= 0) return 'Événement en cours';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Dans ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Dans ${hours}h${minutes}`;
    return `Dans ${minutes} minutes`;
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      FREE: 'Gratuit',
      PAID: 'Payant',
      VIP: 'VIP',
      EARLY_BIRD: 'Early Bird',
      REGULAR: 'Standard'
    };
    return labels[category] || category;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      FREE: 'bg-green-100 text-green-800',
      PAID: 'bg-blue-100 text-blue-800',
      VIP: 'bg-purple-100 text-purple-800',
      EARLY_BIRD: 'bg-yellow-100 text-yellow-800',
      REGULAR: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }

  protected readonly Math = Math;
}
