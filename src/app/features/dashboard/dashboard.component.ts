import { Component, inject, OnInit, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { StorageService } from '../../core/services/storage.service';
import { UserRole } from '../../core/models/user.model';
import { ParticipantDashboardComponent } from './participant-dashboard/participant-dashboard.component';
import { OrganizerDashboardComponent } from './organizer-dashboard/organizer-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard/staff-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ParticipantDashboardComponent,
    OrganizerDashboardComponent,
    StaffDashboardComponent,
    AdminDashboardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private state = inject(StateService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Exposer l'enum pour le template
  UserRole = UserRole;

  // ✅ CORRECTION : On utilise le storage comme source de vérité
  userRole = computed(() => {
    // Côté serveur, pas d'accès au storage
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    // D'abord essayer le state
    let role = this.state.user()?.role;

    // Si pas dans le state, vérifier le storage
    if (!role) {
      const storedUser = this.storage.getUser();
      if (storedUser) {
        // Restaurer le state
        this.state.setUser(storedUser);
        role = storedUser.role;
      }
    }

    return role;
  });

  ngOnInit(): void {
    // ✅ Ne pas exécuter côté serveur (pas de localStorage)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // ✅ CORRECTION : Force la restauration si nécessaire
    if (!this.state.user() && this.storage.getUser()) {
      console.log('🔄 Forcing state restoration in dashboard');
      this.state.setUser(this.storage.getUser());
    }
  }
}
