import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ✅ Routes protégées : rendu côté client uniquement
  // Ces routes dépendent de localStorage (tokens, user) qui n'existe pas côté serveur.
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'events/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'staff/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'staff-management',
    renderMode: RenderMode.Client
  },
  {
    path: 'scan',
    renderMode: RenderMode.Client
  },
  {
    path: 'live-stats/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'tickets',
    renderMode: RenderMode.Client
  },
  {
    path: 'checkout/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'orders/**',
    renderMode: RenderMode.Client
  },

  // ✅ Routes d'auth : pré-rendues (formulaires statiques)
  {
    path: 'auth/login',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Prerender
  },

  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'browse',
    renderMode: RenderMode.Prerender
  },

  {
    path: 'browse/event/:slug',
    renderMode: RenderMode.Client  // ⬅️ IMPORTANT : Client, pas Prerender
  },
  {
    path: 'event/:slug',
    renderMode: RenderMode.Client  // ⬅️ IMPORTANT : Client, pas Prerender
  },

  {
    path: '**',
    renderMode: RenderMode.Client  // ⬅️ Changé de Prerender à Client
  }
];
