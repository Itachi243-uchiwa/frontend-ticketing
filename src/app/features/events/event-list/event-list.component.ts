import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../../../core/services/events.service';
import { StateService } from '../../../core/services/state.service';
import { StorageService } from '../../../core/services/storage.service';
import { Event, EventStatus } from '../../../core/models/event.model';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
  ],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.css'
})
export class EventListComponent implements OnInit {
  private eventsService = inject(EventsService);
  private storage = inject(StorageService);
  private platformId = inject(PLATFORM_ID);
  state = inject(StateService);

  events = signal<Event[]>([]);
  filteredEvents = signal<Event[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  filterStatus = signal<EventStatus | 'ALL'>('ALL');

  currentPage = signal(1);
  totalPages = signal(1);
  totalEvents = signal(0);

  readonly statusOptions = [
    { value: 'ALL', label: 'Tous', color: 'bg-gray-500' },
    { value: EventStatus.DRAFT, label: 'Brouillon', color: 'bg-gray-500' },
    { value: EventStatus.PUBLISHED, label: 'Publié', color: 'bg-green-500' },
    { value: EventStatus.ONGOING, label: 'En cours', color: 'bg-blue-500' },
    { value: EventStatus.COMPLETED, label: 'Terminé', color: 'bg-purple-500' },
    { value: EventStatus.CANCELLED, label: 'Annulé', color: 'bg-red-500' }
  ] as const;

  ngOnInit(): void {
    // ✅ Ne pas faire d'appels API côté serveur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // ✅ CORRECTION : Vérifier l'authentification avant de charger
    console.log('📋 EventListComponent initialized');
    console.log('  - Has token:', this.storage.hasToken());
    console.log('  - Has user:', !!this.storage.getUser());

    // Restaurer le state si nécessaire
    if (!this.state.user() && this.storage.getUser()) {
      console.log('🔄 Restoring user in state');
      this.state.setUser(this.storage.getUser());
    }

    this.loadEvents();
  }

  loadEvents(): void {
    console.log('📡 Loading events...');
    this.loading.set(true);

    this.eventsService.getMyEvents(this.currentPage(), 10).subscribe({
      next: (response: any) => {
        console.log('✅ Events loaded successfully:', response);

        const dataContainer = response.data || response;
        const eventsList = dataContainer.events || [];
        const total = dataContainer.total || eventsList.length || 0;

        if (Array.isArray(eventsList)) {
          this.events.set(eventsList);
        } else {
          this.events.set([]);
        }

        this.totalEvents.set(total);
        this.totalPages.set(Math.ceil(total / 10) || 1);

        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading events:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        // ✅ Message d'erreur plus explicite
        if (error.status === 401) {
          this.state.setError('Session expirée. Veuillez vous reconnecter.');
          console.log('🔍 Debug info:', {
            hasToken: this.storage.hasToken(),
            hasUser: !!this.storage.getUser(),
            token: this.storage.getToken()?.substring(0, 20) + '...'
          });
        } else {
          this.state.setError('Erreur lors du chargement des événements');
        }

        this.events.set([]);
        this.filteredEvents.set([]);
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.events() || [];

    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(event =>
        (event.name?.toLowerCase().includes(query)) ||
        (event.location?.toLowerCase().includes(query)) ||
        (event.description?.toLowerCase().includes(query))
      );
    }

    const status = this.filterStatus();
    if (status !== 'ALL') {
      filtered = filtered.filter(event => event.status === status);
    }

    this.filteredEvents.set(filtered);
  }

  onSearch(event: any): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.applyFilters();
  }

  onFilterStatus(status: EventStatus | 'ALL'): void {
    this.filterStatus.set(status);
    this.applyFilters();
  }

  getStatusColor(status: EventStatus): string {
    const statusConfig = this.statusOptions.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-500';
  }

  getStatusLabel(status: EventStatus): string {
    const statusConfig = this.statusOptions.find(s => s.value === status);
    return statusConfig?.label || status;
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadEvents();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadEvents();
    }
  }
}
