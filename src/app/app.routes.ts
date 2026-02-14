import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },

  // ==================== STAFF ROUTES ====================
  {
    path: 'staff',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.STAFF, UserRole.ORGANIZER, UserRole.ADMIN] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/staff-dashboard/staff-dashboard.component').then(m => m.StaffDashboardComponent)
      }
    ]
  },

  // QR Scanner (STAFF, ORGANIZER, ADMIN)
  {
    path: 'scan',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.STAFF, UserRole.ORGANIZER, UserRole.ADMIN] },
    loadComponent: () => import('./features/scan/scan.component').then(m => m.ScanComponent)
  },

  // Live Dashboard (STAFF, ORGANIZER, ADMIN)
  {
    path: 'live-stats/:eventId',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.STAFF, UserRole.ORGANIZER, UserRole.ADMIN] },
    loadComponent: () => import('./features/dashboard/live-dashboard/live-dashboard.component').then(m => m.LiveDashboardComponent)
  },

  // ==================== ORGANIZER ROUTES ====================
  // Staff Management (ORGANIZER, ADMIN only)
  {
    path: 'staff-management',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ORGANIZER, UserRole.ADMIN] },
    loadComponent: () => import('./features/staff-management/staff-management.component').then(m => m.StaffManagementComponent)
  },

  // Events Management routes (ORGANIZER, ADMIN)
  {
    path: 'events',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ORGANIZER, UserRole.ADMIN] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/events/event-list/event-list.component').then(m => m.EventListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/events/event-detail/event-detail.component').then(m => m.EventDetailComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: ':id/tickets',
        loadComponent: () => import('./features/events/ticket-management/ticket-management.component').then(m => m.TicketManagementComponent)
      },
      {
        path: ':id/live',
        loadComponent: () => import('./features/dashboard/live-dashboard/live-dashboard.component').then(m => m.LiveDashboardComponent)
      }
    ]
  },

  // ==================== PUBLIC ROUTES ====================
  {
    path: 'browse',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/events/events-browse/events-browse.component').then(m => m.EventsBrowseComponent)
      },
      {
        path: 'event/:slug',
        loadComponent: () => import('./features/events/event-public/event-public.component').then(m => m.EventPublicComponent)
      }
    ]
  },
  {
    path: 'event/:slug',
    loadComponent: () => import('./features/events/event-public/event-public.component').then(m => m.EventPublicComponent)
  },

  // ==================== AUTHENTICATED ROUTES (ALL) ====================
  // My Tickets
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-tickets/my-tickets.component').then(m => m.MyTicketsComponent)
  },

  // Checkout
  {
    path: 'checkout',
    canActivate: [authGuard],
    children: [
      {
        path: ':id',
        loadComponent: () => import('./features/checkout/checkout/checkout.component').then(m => m.CheckoutComponent)
      },
      {
        path: 'confirmation/:id',
        loadComponent: () => import('./features/orders/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent)
      }
    ]
  },

  // Orders
  {
    path: 'orders',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/orders/my-orders/my-orders.component').then(m => m.MyOrdersComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
      }
    ]
  },

  {
    path: '**',
    redirectTo: ''
  }
];
