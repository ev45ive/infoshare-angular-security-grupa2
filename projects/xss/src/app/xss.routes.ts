import { Routes } from '@angular/router';
import {
  DomHintComponent,
  DomLabComponent,
  DomSolutionComponent,
  DomSolutionHintComponent,
} from './scenarios/dom-xss';
import {
  BypassHintComponent,
  BypassLabComponent,
  BypassSolutionComponent,
  BypassSolutionHintComponent,
} from './scenarios/sanitizer-bypass';

export const xssRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/xss/(dom//hint:dom-hint)',
  },
  {
    path: 'xss',
    children: [
      { path: 'dom', component: DomLabComponent },
      { path: 'dom-hint', outlet: 'hint', component: DomHintComponent },
      { path: 'dom-solution', component: DomSolutionComponent },
      { path: 'dom-solution-hint', outlet: 'hint', component: DomSolutionHintComponent },
      { path: 'bypass', component: BypassLabComponent },
      { path: 'bypass-hint', outlet: 'hint', component: BypassHintComponent },
      { path: 'bypass-solution', component: BypassSolutionComponent },
      { path: 'bypass-solution-hint', outlet: 'hint', component: BypassSolutionHintComponent },
    ],
  },
  { path: '**', redirectTo: '/xss/(dom//hint:dom-hint)' },
];

