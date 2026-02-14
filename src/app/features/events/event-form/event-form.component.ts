import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { Event, EventStatus } from '../../../core/models/event.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css'
})
export class EventFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  eventForm: FormGroup;
  isEditMode = false;
  eventId: string | null = null;
  isSubmitting = false;
  errorMessage = '';
  currentStep = 1;
  totalSteps = 3;

  readonly statusOptions = [
    { value: EventStatus.DRAFT, label: 'Brouillon' },
    { value: EventStatus.PUBLISHED, label: 'Publié' }
  ];

  constructor() {
    this.eventForm = this.fb.group({
      // Step 1: Informations de base
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      location: ['', [Validators.required]],
      venue: [''],

      // Step 2: Dates et capacité
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      capacity: [100, [Validators.required, Validators.min(1)]],

      // Step 3: Branding
      primaryColor: ['#3B82F6'],
      secondaryColor: ['#1E40AF'],
      status: [EventStatus.DRAFT]
    });
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.params['id'];
    if (this.eventId) {
      this.isEditMode = true;
      this.loadEvent();
    }
  }

  loadEvent(): void {
    if (!this.eventId) return;

    this.eventsService.getById(this.eventId).subscribe({
      next: (response: any) => {
        // ✅ CORRECTION: Gestion de la structure imbriquée pour le chargement aussi
        const event = response?.data || response;

        this.eventForm.patchValue({
          name: event.name,
          description: event.description,
          location: event.location,
          venue: event.venue,
          startDate: this.formatDateForInput(event.startDate),
          endDate: this.formatDateForInput(event.endDate),
          capacity: event.capacity,
          primaryColor: event.primaryColor || '#3B82F6',
          secondaryColor: event.secondaryColor || '#1E40AF',
          status: event.status
        });
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.router.navigate(['/events']);
      }
    });
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  canProceedToNextStep(): boolean {
    if (this.currentStep === 1) {
      return !!(this.eventForm.get('name')?.valid &&
        this.eventForm.get('description')?.valid &&
        this.eventForm.get('location')?.valid);
    }
    if (this.currentStep === 2) {
      return !!(this.eventForm.get('startDate')?.valid &&
        this.eventForm.get('endDate')?.valid &&
        this.eventForm.get('capacity')?.valid);
    }
    return true;
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData = this.eventForm.value;

    const observable = this.isEditMode && this.eventId
      ? this.eventsService.update(this.eventId, formData)
      : this.eventsService.create(formData);

    observable.subscribe({
      next: (response: any) => {
        console.log('✅ API Réponse création/modif:', response);

        // ✅ CORRECTION PRINCIPALE : Recherche de l'ID à plusieurs niveaux
        // Structure probable : response.data.id ou response.data.data.id
        const newEventId = response?.id || response?.data?.id || response?.data?.data?.id;

        if (newEventId) {
          this.router.navigate(['/events', newEventId]);
        } else {
          console.error('⚠️ ID non trouvé dans la réponse, redirection vers la liste.');
          // Fallback : si on ne trouve pas l'ID, on retourne à la liste générale
          this.router.navigate(['/events']);
        }
      },
      error: (error) => {
        console.error('❌ Erreur soumission:', error);
        // Gestion plus fine du message d'erreur si disponible
        this.errorMessage = error.error?.message || error.message || 'Une erreur est survenue lors de la sauvegarde.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.eventForm.get(fieldName);
    if (field?.hasError('required') && field.touched) {
      return 'Ce champ est requis';
    }
    if (field?.hasError('minlength') && field.touched) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} caractères requis`;
    }
    if (field?.hasError('min') && field.touched) {
      return 'La valeur doit être supérieure à 0';
    }
    return '';
  }
}
