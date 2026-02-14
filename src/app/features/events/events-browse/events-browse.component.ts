import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../../../core/services/events.service';
import { Event, EventStatus } from '../../../core/models/event.model';


@Component({
  selector: 'app-events-browse',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './events-browse.component.html',
  styleUrl: './events-browse.component.css'
})
export class EventsBrowseComponent implements OnInit {
  private eventsService = inject(EventsService);

  events = signal<Event[]>([]);
  filteredEvents = signal<Event[]>([]);
  loading = signal(false);
  searchQuery = '';

  currentPage = signal(1);
  totalPages = signal(1);
  totalEvents = signal(0);
  readonly limit = 12;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);

    // Charger uniquement les événements PUBLISHED (publics)
    this.eventsService.getAll(this.currentPage(), this.limit, EventStatus.PUBLISHED).subscribe({
      next: (response: any) => {
        const dataContainer = response.data || response;
        const eventsList = dataContainer.events || [];
        const total = dataContainer.total || eventsList.length || 0;

        if (Array.isArray(eventsList)) {
          this.events.set(eventsList);
        } else {
          this.events.set([]);
        }

        this.totalEvents.set(total);
        this.totalPages.set(Math.ceil(total / this.limit) || 1);

        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur chargement événements:', error);
        this.events.set([]);
        this.filteredEvents.set([]);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim().length >= 3) {
      // Utiliser la recherche backend si disponible
      this.eventsService.search(this.searchQuery, this.limit).subscribe({
        next: (response: any) => {
          const results = response?.data || response || [];
          this.filteredEvents.set(Array.isArray(results) ? results : []);
        },
        error: () => {
          this.applyFilters();
        }
      });
    } else {
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let filtered = this.events() || [];

    if (this.searchQuery.trim().length < 3 && this.searchQuery.trim().length > 0) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    this.filteredEvents.set(filtered);
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
}
