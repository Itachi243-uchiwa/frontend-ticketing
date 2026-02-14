import { Component, OnInit, inject, signal, Input } from '@angular/core'; // Ajout de Input
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketsService } from '../../../core/services/tickets.service';
import { EventsService } from '../../../core/services/events.service';
import { TicketType, TicketTypeCategory } from '../../../core/models/ticket.model';
import { Event } from '../../../core/models/event.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';

@Component({
  selector: 'app-ticket-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './ticket-management.component.html',
  styleUrl: './ticket-management.component.css'
})
export class TicketManagementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ticketsService = inject(TicketsService);
  private eventsService = inject(EventsService);

  // ✅ NOUVEAU : Inputs pour le mode "Intégré"
  @Input() eventIdInput?: string;
  @Input() isEmbedded = false;

  event = signal<Event | null>(null);
  tickets = signal<TicketType[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingTicket = signal<TicketType | null>(null);
  isSubmitting = signal(false);

  ticketForm: FormGroup;
  eventId = '';

  readonly categories = [
    { value: TicketTypeCategory.FREE, label: 'Gratuit', color: 'bg-green-100 text-green-800' },
    { value: TicketTypeCategory.PAID, label: 'Payant', color: 'bg-blue-100 text-blue-800' },
    { value: TicketTypeCategory.VIP, label: 'VIP', color: 'bg-purple-100 text-purple-800' },
    { value: TicketTypeCategory.EARLY_BIRD, label: 'Early Bird', color: 'bg-yellow-100 text-yellow-800' },
    { value: TicketTypeCategory.REGULAR, label: 'Standard', color: 'bg-gray-100 text-gray-800' }
  ];

  constructor() {
    this.ticketForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: [TicketTypeCategory.REGULAR, Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [100, [Validators.required, Validators.min(1)]],
      salesStartDate: [''],
      salesEndDate: [''],
      maxPerOrder: [10],
      minPerOrder: [1],
      displayOrder: [0]
    });
  }

  ngOnInit(): void {
    // ✅ Logique : Si on a un Input (mode intégré), on l'utilise. Sinon on regarde l'URL.
    this.eventId = this.eventIdInput || this.route.snapshot.params['id'];

    if (this.eventId) {
      // Si on n'est pas en mode intégré, on charge l'event pour avoir le titre
      // Si on est intégré, le parent a déjà l'info, mais on peut le recharger ou passer l'objet event en Input aussi
      this.loadEvent();
      this.loadTickets();
    } else {
      this.router.navigate(['/events']);
    }
  }

  loadEvent(): void {
    this.eventsService.getById(this.eventId).subscribe({
      next: (response: any) => {
        const eventData = response?.data || response;
        this.event.set(eventData);
      },
      error: () => {
        // En mode intégré, on évite de rediriger brutalement
        if (!this.isEmbedded) {
          this.router.navigate(['/events']);
        }
      }
    });
  }

  loadTickets(): void {
    this.loading.set(true);
    this.ticketsService.getByEventId(this.eventId).subscribe({
      next: (response: any) => {
        const dataContainer = response?.data || response;
        const ticketsList = Array.isArray(dataContainer) ? dataContainer : (dataContainer?.tickets || []);

        if (Array.isArray(ticketsList)) {
          this.tickets.set(ticketsList);
        } else {
          this.tickets.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement tickets:', err);
        this.tickets.set([]);
        this.loading.set(false);
      }
    });
  }

  // ... (Le reste des méthodes openForm, closeForm, onSubmit, deleteTicket restent inchangées) ...
  // Je les remets pour la complétude du fichier
  openForm(ticket?: TicketType): void {
    if (ticket) {
      this.editingTicket.set(ticket);
      this.ticketForm.patchValue({
        name: ticket.name,
        description: ticket.description,
        category: ticket.category,
        price: ticket.price,
        quantity: ticket.quantity,
        salesStartDate: ticket.salesStartDate ? this.formatDateForInput(ticket.salesStartDate) : '',
        salesEndDate: ticket.salesEndDate ? this.formatDateForInput(ticket.salesEndDate) : '',
        maxPerOrder: ticket.maxPerOrder,
        minPerOrder: ticket.minPerOrder,
        displayOrder: ticket.displayOrder
      });
    } else {
      this.editingTicket.set(null);
      this.ticketForm.reset({
        category: TicketTypeCategory.REGULAR,
        price: 0,
        quantity: 100,
        maxPerOrder: 10,
        minPerOrder: 1,
        displayOrder: 0
      });
    }
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTicket.set(null);
    this.ticketForm.reset();
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.ticketForm.value;

    if (formData.salesStartDate) formData.salesStartDate = new Date(formData.salesStartDate);
    else delete formData.salesStartDate;
    if (formData.salesEndDate) formData.salesEndDate = new Date(formData.salesEndDate);
    else delete formData.salesEndDate;

    const observable = this.editingTicket()
      ? this.ticketsService.update(this.eventId, this.editingTicket()!.id, formData)
      : this.ticketsService.create(this.eventId, formData);

    observable.subscribe({
      next: () => {
        this.loadTickets();
        this.closeForm();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        alert(error.error?.message || 'Erreur lors de l\'enregistrement');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteTicket(ticket: TicketType): void {
    if (ticket.sold > 0) {
      alert(`Impossible de supprimer ce billet car ${ticket.sold} billets ont déjà été vendus.`);
      return;
    }
    if (confirm(`Voulez-vous vraiment supprimer le billet "${ticket.name}" ?`)) {
      this.ticketsService.delete(this.eventId, ticket.id).subscribe({
        next: () => this.loadTickets(),
        error: (error) => alert(error.error?.message || 'Erreur lors de la suppression')
      });
    }
  }

  getCategoryInfo(category: TicketTypeCategory) {
    return this.categories.find(c => c.value === category) || this.categories[0];
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';
    try { return new Date(date).toISOString().slice(0, 16); } catch (e) { return ''; }
  }

  getFieldError(fieldName: string): string {
    const field = this.ticketForm.get(fieldName);
    if (field?.hasError('required') && field.touched) return 'Ce champ est requis';
    if (field?.hasError('min') && field.touched) return 'Valeur invalide';
    if (field?.hasError('minlength') && field.touched) return 'Trop court';
    return '';
  }

  onDragStart(event: DragEvent, index: number): void {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', index.toString());
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer!.getData('text/plain'));
    if (dragIndex !== dropIndex) {
      const items = [...this.tickets()];
      const draggedItem = items[dragIndex];
      items.splice(dragIndex, 1);
      items.splice(dropIndex, 0, draggedItem);
      items.forEach((item, index) => {
        if (item.displayOrder !== index) {
          this.ticketsService.update(this.eventId, item.id, { displayOrder: index }).subscribe();
        }
      });
      this.tickets.set(items);
    }
  }
}
