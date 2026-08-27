import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'training/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/training/training.component').then((m) => m.TrainingComponent),
  },
  {
    path: 'puzzles',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/puzzles/puzzles.component').then((m) => m.PuzzlesComponent),
  },
  {
    path: 'puzzles/themes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/puzzle-themes/puzzle-themes.component').then(
        (m) => m.PuzzleThemesComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
