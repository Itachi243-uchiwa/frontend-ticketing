import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { TicketsService } from '../../../core/services/tickets.service';
import { Order, OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css'
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordersService = inject(OrdersService);
  private ticketsService = inject(TicketsService);
  private platformId = inject(PLATFORM_ID);

  order = signal<Order | null>(null);
  loading = signal(true);
  isCancelling = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    const orderId = this.route.snapshot.params['id'];
    if (orderId) {
      this.loadOrder(orderId);
    }
  }

  loadOrder(id: string): void {
    this.loading.set(true);
    this.ordersService.getById(id).subscribe({
      next: (response: any) => {
        const orderData = response?.data || response;
        this.order.set(orderData);
        this.loading.set(false);
      },
      error: () => {
        this.router.navigate(['/orders']);
      }
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

  getStatusColor(status: OrderStatus): string {
    const colors = {
      [OrderStatus.PENDING]: 'bg-yellow-500',
      [OrderStatus.PAID]: 'bg-green-500',
      [OrderStatus.CANCELLED]: 'bg-red-500',
      [OrderStatus.REFUNDED]: 'bg-purple-500',
      [OrderStatus.EXPIRED]: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  getStatusLabel(status: OrderStatus): string {
    const labels = {
      [OrderStatus.PENDING]: 'En attente',
      [OrderStatus.PAID]: 'Payé',
      [OrderStatus.CANCELLED]: 'Annulé',
      [OrderStatus.REFUNDED]: 'Remboursé',
      [OrderStatus.EXPIRED]: 'Expiré'
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Date inconnue';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalTickets(): number {
    return this.order()?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  }

  proceedToPayment(): void {
    const currentOrder = this.order();
    if (currentOrder?.id) {
      this.router.navigate(['/checkout', currentOrder.id]);
    }
  }

  cancelOrder(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    if (currentOrder.status !== OrderStatus.PENDING) {
      alert('Seules les commandes en attente peuvent être annulées.');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;

    this.isCancelling.set(true);
    this.ordersService.cancel(currentOrder.id).subscribe({
      next: (updated) => {
        const orderData = (updated as any)?.data || updated;
        this.order.set(orderData);
        this.isCancelling.set(false);
        alert('Commande annulée avec succès');
      },
      error: (error) => {
        alert(error.error?.message || 'Erreur lors de l\'annulation');
        this.isCancelling.set(false);
      }
    });
  }

  isExpired(): boolean {
    const order = this.order();
    if (!order || !order.expiresAt) return false;
    return new Date() > new Date(order.expiresAt);
  }
}
