import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '../../../shared/components/card/card.component';
import { OrdersService } from '../../../core/services/orders.service';
import { Order } from '../../../core/models/order.model';
import { TicketsService } from '../../../core/services/tickets.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.css'
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ordersService = inject(OrdersService);
  private ticketsService = inject(TicketsService);
  private platformId = inject(PLATFORM_ID);

  order = signal<Order | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    const orderId = this.route.snapshot.params['id'];
    this.loadOrder(orderId);
  }

  loadOrder(id: string): void {
    this.ordersService.getById(id).subscribe({
      next: (response: any) => {
        const order = response?.data || response;

        if (!order || !order.id) {
          this.router.navigate(['/']);
          return;
        }

        if (order.status !== 'PAID') {
          this.router.navigate(['/orders', order.id]);
          return;
        }

        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.router.navigate(['/']);
      }
    });
  }

  downloadTickets(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.loading.set(true);

    this.ticketsService.downloadTickets(currentOrder.eventId, currentOrder.id).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          alert('Les billets sont en cours de génération, réessayez dans quelques secondes.');
          this.loading.set(false);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billets-${currentOrder.orderNumber || currentOrder.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          alert('Les billets PDF sont en cours de génération. Veuillez réessayer dans quelques secondes.');
        } else {
          alert('Erreur lors du téléchargement des billets.');
        }
        this.loading.set(false);
      }
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalTickets(): number {
    const order = this.order();
    if (!order) return 0;
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
}
