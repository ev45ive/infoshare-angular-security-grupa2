import { Routes } from '@angular/router';
import { IdorLabComponent } from './idor/idor-lab.component';

export const appRoutes: Routes = [
  { path: 'idor', component: IdorLabComponent },
  { path: '', pathMatch: 'full', redirectTo: '/idor' },
  { path: '**', redirectTo: '/idor' },
];

