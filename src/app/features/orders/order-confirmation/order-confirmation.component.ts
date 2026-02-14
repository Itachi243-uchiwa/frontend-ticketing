import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
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
      error: () => this.router.navigate(['/'])
    });
  }

  downloadTickets(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;
    this.loading.set(true);
    this.pollAndDownload(currentOrder.eventId, currentOrder.id, currentOrder.orderNumber, 0);
  }

  private pollAndDownload(eventId: string, orderId: string, orderNumber: string, attempt: number): void {
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL = 2000;

    // ✅ Tout passe par le service — le service gère l'auth + le proxy backend
    this.ticketsService.downloadTicketsPdf(eventId, orderId).subscribe({
      next: ({ blob, filename }) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename || `billets-${orderNumber || orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        this.loading.set(false);
      },
      error: (err) => {
        // 404 = PDF pas encore généré → on réessaie
        if (err.status === 404 && attempt < MAX_ATTEMPTS) {
          setTimeout(() => this.pollAndDownload(eventId, orderId, orderNumber, attempt + 1), POLL_INTERVAL);
        } else {
          alert('Erreur lors du téléchargement des billets.');
          this.loading.set(false);
        }
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
