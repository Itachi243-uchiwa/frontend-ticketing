import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ✅ Routes protégées : rendu côté client uniquement
  // Ces routes dépendent de localStorage (tokens, user) qui n'existe pas côté serveur.
  // RenderMode.Client évite que le SSR déclenche des appels API sans token (→ 401 en boucle).
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
  // ✅ Routes d'auth : pré-rendues (pas de token requis, formulaires statiques)
  {
    path: 'auth/**',
    renderMode: RenderMode.Prerender
  },
  // ✅ Routes publiques : pré-rendues pour le SEO
  {
    path: 'browse',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'browse/**',
    renderMode: RenderMode.Prerender
  },
  // Routes publiques peuvent être pré-rendues
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
