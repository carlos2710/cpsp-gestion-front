
import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SeleccionComponent } from './features/auth/seleccion/seleccion.component';
import { MainLayoutComponent } from './features/layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { requireAuthGuard, requireLocalGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'seleccion', component: SeleccionComponent, canActivate: [requireAuthGuard] },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [requireLocalGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'solicitudes',
        children: [
          {
            path: 'registrar',
            loadComponent: () => import('./features/solicitudes/registro/solicitud-registro.component')
              .then(component => component.SolicitudRegistroComponent)
          },
          { path: '', redirectTo: 'registrar', pathMatch: 'full' }
        ]
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/control-usuarios/control-usuarios.component')
          .then(component => component.ControlUsuariosComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
