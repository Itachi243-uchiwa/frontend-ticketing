import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { StaffService } from '../../core/services/staff.service';
import { EventsService } from '../../core/services/events.service';
import { User, UserRole } from '../../core/models/user.model';
import { Event } from '../../core/models/event.model';
import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  private usersService = inject(UsersService);
  private staffService = inject(StaffService);
  private eventsService = inject(EventsService);

  // Données
  participants = signal<User[]>([]);
  staffMembers = signal<User[]>([]);
  filteredParticipants = signal<User[]>([]);
  myEvents = signal<Event[]>([]);
  staffAssignments = signal<Map<string, any[]>>(new Map());

  // UI states
  loadingParticipants = signal(false);
  loadingStaff = signal(false);
  loadingEvents = signal(false);
  promoting = signal<string | null>(null);
  demoting = signal<string | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  searchParticipant = '';

  // Modal de sélection d'événements
  showEventSelector = signal(false);
  selectedUser = signal<User | null>(null);
  selectedEventIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadParticipants();
    this.loadMyStaff();
    this.loadMyEvents();
  }

  loadParticipants(): void {
    this.loadingParticipants.set(true);
    this.usersService.getUsers(1, 100, UserRole.PARTICIPANT).subscribe({
      next: (response: any) => {
        const users = response?.data?.users || response?.users || [];
        this.participants.set(users);
        this.filteredParticipants.set(users);
        this.loadingParticipants.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur lors du chargement des participants');
        this.loadingParticipants.set(false);
        this.participants.set([]);
        this.filteredParticipants.set([]);
      }
    });
  }

  /**
   * ✅ Charge uniquement les staff de l'organisateur connecté
   */
  loadMyStaff(): void {
    this.loadingStaff.set(true);
    this.staffService.getMyStaff(1, 100).subscribe({
      next: (response: any) => {
        const users = response?.data?.users || response?.users || [];
        this.staffMembers.set(users);
        this.loadingStaff.set(false);

        // Charger les assignations pour chaque staff
        for (const staff of users) {
          this.loadStaffAssignments(staff.id);
        }
      },
      error: () => {
        this.errorMessage.set('Erreur lors du chargement du staff');
        this.loadingStaff.set(false);
        this.staffMembers.set([]);
      }
    });
  }

  loadMyEvents(): void {
    this.loadingEvents.set(true);
    this.eventsService.getMyEvents(1, 100).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const eventsList = Array.isArray(dataContainer) ? dataContainer : (dataContainer?.events || []);
        this.myEvents.set(eventsList);
        this.loadingEvents.set(false);
      },
      error: () => {
        this.loadingEvents.set(false);
        this.myEvents.set([]);
      }
    });
  }

  loadStaffAssignments(staffId: string): void {
    this.staffService.getStaffAssignments(staffId).subscribe({
      next: (response: any) => {
        const assignments = response?.data || response || [];
        this.staffAssignments.update(map => {
          const newMap = new Map(map);
          newMap.set(staffId, assignments);
          return newMap;
        });
      },
      error: () => { /* Silently fail */ }
    });
  }

  getStaffEventNames(staffId: string): string[] {
    const assignments = this.staffAssignments().get(staffId) || [];
    return assignments.map((a: any) => a.event?.name || 'Événement inconnu');
  }

  /**
   * ✅ Ouvre le sélecteur d'événements avant la promotion
   */
  openEventSelector(user: User): void {
    this.selectedUser.set(user);
    this.selectedEventIds.set(new Set());
    this.showEventSelector.set(true);
  }

  closeEventSelector(): void {
    this.showEventSelector.set(false);
    this.selectedUser.set(null);
    this.selectedEventIds.set(new Set());
  }

  toggleEventSelection(eventId: string): void {
    this.selectedEventIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(eventId)) {
        newIds.delete(eventId);
      } else {
        newIds.add(eventId);
      }
      return newIds;
    });
  }

  isEventSelected(eventId: string): boolean {
    return this.selectedEventIds().has(eventId);
  }

  /**
   * ✅ Promotion avec événements sélectionnés
   */
  confirmPromotion(): void {
    const user = this.selectedUser();
    const eventIds = Array.from(this.selectedEventIds());

    if (!user || eventIds.length === 0) {
      this.errorMessage.set('Veuillez sélectionner au moins un événement');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    this.promoting.set(user.id);
    this.closeEventSelector();

    this.usersService.promoteToStaff(user.id, eventIds).subscribe({
      next: () => {
        this.successMessage.set(`${user.firstName} ${user.lastName} a été promu(e) Staff et assigné(e) à ${eventIds.length} événement(s) !`);
        this.promoting.set(null);
        this.loadData();
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (error) => {
        const msg = error.error?.data?.message || error.error?.message || 'Erreur lors de la promotion';
        this.errorMessage.set(msg);
        this.promoting.set(null);
        setTimeout(() => this.errorMessage.set(''), 4000);
      }
    });
  }

  demoteStaff(user: User): void {
    if (!confirm(`Êtes-vous sûr de vouloir rétrograder ${user.firstName} ${user.lastName} en Participant ? Toutes ses assignations d'événements seront supprimées.`)) {
      return;
    }

    this.demoting.set(user.id);
    this.usersService.demoteStaff(user.id).subscribe({
      next: () => {
        this.successMessage.set(`${user.firstName} ${user.lastName} a été rétrogradé(e) en Participant`);
        this.demoting.set(null);
        this.loadData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        const msg = error.error?.data?.message || error.error?.message || 'Erreur lors de la rétrogradation';
        this.errorMessage.set(msg);
        this.demoting.set(null);
        setTimeout(() => this.errorMessage.set(''), 3000);
      }
    });
  }

  filterParticipants(): void {
    const search = this.searchParticipant.toLowerCase().trim();
    if (!search) {
      this.filteredParticipants.set(this.participants());
      return;
    }

    const filtered = this.participants().filter(user =>
      user.firstName.toLowerCase().includes(search) ||
      user.lastName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
    this.filteredParticipants.set(filtered);
  }
}
