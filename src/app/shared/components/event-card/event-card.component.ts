import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Event, EventStatus } from '../../../core/models/event.model';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.css'
})
export class EventCardComponent {
  @Input({ required: true }) event!: Event;
  @Input() showActions = false;

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
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
