import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';
import { DashboardResumen } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtenerResumen(codPerfil: number, codEmpresa: number, codLocal: number): Observable<DashboardResumen> {
    const params = new HttpParams()
      .set('codPerfil', codPerfil)
      .set('codEmpresa', codEmpresa)
      .set('codLocal', codLocal);
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    return this.http.get<DashboardResumen>(`${environment.apiUrl}dashboard/resumen`, { params, headers });
  }
}
