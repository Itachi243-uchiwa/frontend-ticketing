import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {ButtonComponent} from '../../../shared/components/button/button.component';
import {CardComponent} from '../../../shared/components/card/card.component';
import {OrdersService} from '../../../core/services/orders.service';
import {Order} from '../../../core/models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private ordersService = inject(OrdersService);

  order = signal<Order | null>(null);
  loading = signal(true);
  isProcessing = signal(false);

  checkoutForm: FormGroup;
  currentStep = signal(1);

  readonly paymentMethods = [
    { value: 'sumup', label: 'SumUp', icon: '📱' }
  ];

  constructor() {
    this.checkoutForm = this.fb.group({
      // Billing info
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],

      // Payment - Default to SumUp
      paymentMethod: ['sumup', Validators.required],

      // Terms
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    const orderId = this.route.snapshot.params['id'];
    console.log('🛒 Checkout - ID commande:', orderId);

    if (!orderId) {
      console.error('❌ Aucun ID de commande fourni');
      this.router.navigate(['/']);
      return;
    }

    this.loadOrder(orderId);
  }

  loadOrder(id: string): void {
    console.log('📥 Chargement commande ID:', id);
    this.ordersService.getById(id).subscribe({
      next: (response: any) => {
        // Extraction sécurisée de la commande
        const order = response?.data || response;
        console.log('✅ Commande chargée:', order);

        if (!order || !order.id) {
          console.error('❌ Commande invalide:', response);
          this.router.navigate(['/']);
          return;
        }

        if (order.status !== 'PENDING') {
          console.log('⚠️ Commande non PENDING, redirection vers détails');
          this.router.navigate(['/orders', order.id]);
          return;
        }

        this.order.set(order);
        this.loading.set(false);

        // Pre-fill form with user data if available
        if (order.user) {
          this.checkoutForm.patchValue({
            firstName: order.user.firstName,
            lastName: order.user.lastName,
            email: order.user.email,
            phone: order.user.phone
          });
        }
      },
      error: (err) => {
        console.error('❌ Erreur chargement commande:', err);
        this.router.navigate(['/']);
      }
    });
  }

  nextStep(): void {
    if (this.currentStep() === 1 && this.isBillingValid()) {
      this.currentStep.set(2);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  isBillingValid(): boolean {
    const controls = ['firstName', 'lastName', 'email'];
    return controls.every(c => this.checkoutForm.get(c)?.valid);
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const order = this.order();
    if (!order) return;

    this.isProcessing.set(true);

    // ✅ SIMULATION DE PAIEMENT (en attendant l'intégration SumUp)
    // Pour le moment, on confirme automatiquement le paiement
    console.log('💳 Simulation de paiement SumUp...');

    setTimeout(() => {
      const paymentMethod = 'sumup';
      const paymentId = 'SUMUP-SIM-' + Date.now();

      this.ordersService.confirmPayment(order.id, paymentMethod, paymentId).subscribe({
        next: (response: any) => {
          const paidOrder = response?.data || response;
          console.log('✅ Paiement confirmé:', paidOrder);

          if (paidOrder && paidOrder.id) {
            this.router.navigate(['/checkout/confirmation', paidOrder.id]);
          } else {
            console.error('❌ Réponse de paiement invalide:', response);
            alert('Paiement effectué mais erreur de redirection');
            this.isProcessing.set(false);
          }
        },
        error: (error) => {
          console.error('❌ Erreur paiement:', error);
          alert(error.error?.message || 'Erreur lors du paiement');
          this.isProcessing.set(false);
        }
      });
    }, 1500); // Petite animation de chargement
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeRemaining(): string {
    const order = this.order();
    if (!order || !order.expiresAt) return '';

    const now = new Date().getTime();
    const expiry = new Date(order.expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expiré';

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
