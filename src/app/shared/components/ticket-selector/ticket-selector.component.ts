import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketType } from '../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-selector.component.html',
  styleUrl: './ticket-selector.component.css'
})
export class TicketSelectorComponent {
  @Input({ required: true }) ticket!: TicketType;
  @Input() quantity = signal(0);
  @Input() cart = signal<Map<string, number>>(new Map());

  @Output() quantityChange = new EventEmitter<{ ticketId: string; quantity: number }>();
  @Output() add = new EventEmitter<TicketType>();
  @Output() remove = new EventEmitter<string>();

  currentQuantity = computed(() => this.cart().get(this.ticket.id) || 0);

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

  increment(): void {
    const current = this.currentQuantity();
    const max = Math.min(
      this.ticket.maxPerOrder || 999,
      this.ticket.available || 0
    );

    if (current < max) {
      this.add.emit(this.ticket);
    }
  }

  decrement(): void {
    const current = this.currentQuantity();
    const min = this.ticket.minPerOrder || 0;

    if (current > min) {
      this.remove.emit(this.ticket.id);
    }
  }

  setQuantity(value: number): void {
    const min = this.ticket.minPerOrder || 0;
    const max = Math.min(
      this.ticket.maxPerOrder || 999,
      this.ticket.available || 0
    );

    if (value >= min && value <= max) {
      this.quantityChange.emit({ ticketId: this.ticket.id, quantity: value });
    }
  }

  canIncrement(): boolean {
    const current = this.currentQuantity();
    const max = Math.min(
      this.ticket.maxPerOrder || 999,
      this.ticket.available || 0
    );
    return current < max;
  }

  canDecrement(): boolean {
    const current = this.currentQuantity();
    const min = this.ticket.minPerOrder || 0;
    return current > min;
  }

  protected readonly Math = Math;
}
