import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DashboardResumen } from './dashboard.model';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../enviroments/environment';

function stored(key: string): string | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
}

@Component({
  selector: 'app-dashboard', standalone: true, imports: [CommonModule],
  templateUrl: './dashboard.component.html', styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly resumen = signal<DashboardResumen | null>(null);
  readonly cargando = signal(false);
  readonly error = signal(false);
  readonly perfil = Number(stored('codPerfil'));
  readonly empresa = Number(stored('codEmpresa'));
  readonly local = Number(stored('codLocal'));
  readonly nombreLocal = stored('descLocal') || 'Local seleccionado';
  readonly backendPendiente = !environment.dashboardApiEnabled;

  readonly indicadoresBase = [
    { clave: 'colegiadosActivos', titulo: 'Colegiados activos', icono: '♙' },
    { clave: 'solicitudesPendientes', titulo: 'Solicitudes pendientes', icono: '▤' },
    { clave: 'solicitudesAprobadasMes', titulo: 'Aprobadas este mes', icono: '✓' }
  ];

  ngOnInit(): void {
    if (![this.perfil, this.empresa, this.local].every(v => Number.isInteger(v) && v > 0)) {
      this.error.set(true);
      return;
    }
    if (this.backendPendiente) return;
    this.cargando.set(true);
    this.dashboardService.obtenerResumen(this.perfil, this.empresa, this.local)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: resumen => this.resumen.set(resumen),
        error: () => this.error.set(true)
      });
  }

  tarjetas(): { clave: string; titulo: string; valor: number | null; icono: string }[] {
    const resumen = this.resumen();
    if (resumen?.indicadores.length) {
      return resumen.indicadores.map((indicador, index) => ({
        ...indicador,
        icono: this.indicadoresBase.find(base => base.clave === indicador.clave)?.icono ?? ['◈', '▤', '✓'][index % 3]
      }));
    }
    return this.indicadoresBase.map(indicador => ({ ...indicador, valor: null }));
  }

  porcentajeBarra(cantidad: number): number {
    const maximo = Math.max(...(this.resumen()?.solicitudesPorEstado.map(item => item.cantidad) ?? [0]), 1);
    return Math.max(4, cantidad / maximo * 100);
  }
}
