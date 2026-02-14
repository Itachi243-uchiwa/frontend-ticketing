import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {CardComponent} from '../../../shared/components/card/card.component';
import {OrdersService} from '../../../core/services/orders.service';
import {Order, OrderStatus} from '../../../core/models/order.model';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css'
})
export class MyOrdersComponent implements OnInit {
  private ordersService = inject(OrdersService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);
  totalOrders = signal(0);

  paidOrdersCount = computed(() => this.orders().filter(o => o.status === 'PAID').length);
  pendingOrdersCount = computed(() => this.orders().filter(o => o.status === 'PENDING').length);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.getMyOrders(this.currentPage(), 10).subscribe({
      next: (response: any) => {
        // Extraction sécurisée des commandes
        const data = response?.data || response;
        const orders = Array.isArray(data?.orders) ? data.orders : (Array.isArray(data) ? data : []);
        const total = data?.total || orders.length;

        console.log('📦 Commandes chargées:', orders);

        this.orders.set(orders);
        this.totalOrders.set(total);
        this.totalPages.set(Math.ceil(total / 10));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement commandes:', err);
        this.orders.set([]);
        this.loading.set(false);
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalTickets(order: Order): number {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadOrders();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadOrders();
    }
  }
}
