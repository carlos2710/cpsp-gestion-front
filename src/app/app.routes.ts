
import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SeleccionComponent } from './features/auth/seleccion/seleccion.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'seleccion', component: SeleccionComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
