import { Routes } from '@angular/router';
import { SiteLayoutComponent } from './site-layout.component';
import { SiteLabComponent } from './site-lab.component';
import { SiteHintComponent } from './site-hint.component';
import { SiteSolutionComponent } from './site-solution.component';
import { SiteExplanationComponent } from './site-explanation.component';

export const siteRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/site/(lab//sidebar:hint)' },
  {
    path: 'site',
    component: SiteLayoutComponent,
    children: [
      { path: 'lab', component: SiteLabComponent },
      { path: 'solution', component: SiteSolutionComponent },
      { path: 'hint', outlet: 'sidebar', component: SiteHintComponent },
      { path: 'explanation', outlet: 'sidebar', component: SiteExplanationComponent },
      { path: '', pathMatch: 'full', redirectTo: 'lab' },
    ],
  },
  { path: '**', redirectTo: '/site/(lab//sidebar:hint)' },
];
