import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  features = [
    {
      icon: '🎫',
      title: 'Billetterie Simple',
      description: 'Créez et gérez vos événements en quelques clics'
    },
    {
      icon: '📊',
      title: 'Stats Temps Réel',
      description: 'Suivez vos ventes et scans en direct le jour J'
    },
    {
      icon: '💳',
      title: 'Paiement Sécurisé',
      description: 'Intégration SumUp pour des paiements rapides et sûrs'
    },
    {
      icon: '📱',
      title: 'Scan Mobile',
      description: 'Application scan hors ligne pour votre staff'
    }
  ];
}
