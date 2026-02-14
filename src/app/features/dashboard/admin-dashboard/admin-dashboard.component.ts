import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private state = inject(StateService);

  user = this.state.user;

  stats = [
    { label: 'Utilisateurs', value: '0', icon: '👥', detail: 'Total', borderColor: '#6366F1' },
    { label: 'Événements', value: '0', icon: '🎪', detail: 'Actifs', borderColor: '#10B981' },
    { label: 'Revenus', value: '€0', icon: '💰', detail: 'Total', borderColor: '#3B82F6' },
    { label: 'Billets', value: '0', icon: '🎟️', detail: 'Vendus', borderColor: '#F59E0B' },
  ];

  userRoles = [
    { label: 'Participants', count: 0, color: '#6366F1' },
    { label: 'Organisateurs', count: 0, color: '#10B981' },
    { label: 'Staff', count: 0, color: '#F59E0B' },
    { label: 'Admins', count: 0, color: '#EF4444' },
  ];

  systemServices = [
    { name: 'API', status: 'healthy' },
    { name: 'Base de données', status: 'healthy' },
    { name: 'Redis', status: 'healthy' },
    { name: 'Email Service', status: 'healthy' },
  ];

  ngOnInit(): void {
    // TODO: Charger les données réelles
  }
}
