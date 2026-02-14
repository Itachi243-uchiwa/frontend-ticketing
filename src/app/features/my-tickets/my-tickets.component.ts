import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import {CardComponent} from '../../shared/components/card/card.component';
import {ButtonComponent} from '../../shared/components/button/button.component';
import {TicketsService} from '../../core/services/tickets.service';
import {Ticket, TicketStatus} from '../../core/models/ticket.model';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-tickets.component.html',
  styleUrl: './my-tickets.component.css'
})
export class MyTicketsComponent implements OnInit {
  private ticketsService = inject(TicketsService);
  private platformId = inject(PLATFORM_ID);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'upcoming' | 'past'>('all');
  expandedTicket = signal<string | null>(null);
  resendingId = signal<string | null>(null);

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.ticketsService.getMyTickets().subscribe({
      next: (response) => {
        const raw = (response as any)?.data ?? response;
        const tickets = Array.isArray(raw) ? raw : [];

        console.log(tickets)
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.tickets.set([]);
        this.loading.set(false);
      }
    });
  }

  get filteredTickets(): Ticket[] {
    const now = new Date();
    const all = this.tickets();
    switch (this.filter()) {
      case 'upcoming':
        // ✅ Inclure VALID et ACTIVE (backend peut retourner l'un ou l'autre)
        return all.filter(t =>
          t.event &&
          new Date(t.event.startDate) > now &&
          (t.status === TicketStatus.VALID || (t.status as string) === 'ACTIVE')
        );
      case 'past':
        // ✅ FIX : parenthèses correctes pour l'opérateur || avec &&
        return all.filter(t =>
          (t.event && new Date(t.event.endDate) < now) ||
          t.status === TicketStatus.USED ||
          (t.status as string) === 'SCANNED'
        );
      default:
        return all;
    }
  }

  toggleExpand(ticketId: string): void {
    this.expandedTicket.set(this.expandedTicket() === ticketId ? null : ticketId);
  }

  resendTicket(ticket: Ticket): void {
    this.resendingId.set(ticket.id);
    this.ticketsService.resendTicket(ticket.eventId, ticket.id).subscribe({
      next: () => {
        this.resendingId.set(null);
        alert('Billet renvoyé par email avec succès !');
      },
      error: () => {
        this.resendingId.set(null);
        alert('Erreur lors du renvoi du billet');
      }
    });
  }

  getStatusConfig(status: TicketStatus | string): { label: string; color: string; bg: string } {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      [TicketStatus.VALID]:     { label: 'Valide',   color: 'text-green-700', bg: 'bg-green-100' },
      [TicketStatus.USED]:      { label: 'Utilisé',  color: 'text-blue-700',  bg: 'bg-blue-100'  },
      [TicketStatus.CANCELLED]: { label: 'Annulé',   color: 'text-red-700',   bg: 'bg-red-100'   },
      [TicketStatus.EXPIRED]:   { label: 'Expiré',   color: 'text-gray-700',  bg: 'bg-gray-100'  },
    };
    return configs[status] ?? configs[TicketStatus.VALID];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
