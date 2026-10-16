import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface MenuPerfil {
  perfil: string;
  codigoModulo: number;
  modulo: string;
  codigoSubmenu: number;
  submenu: string;
  ruta: string;
  orden: number;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  obtenerMenusPorPerfil(codPerfil: number): Observable<MenuPerfil[]> {
    return this.http.get<MenuPerfil[]>(
      `${environment.apiUrl}menus/perfil/${codPerfil}`,
      { headers: this.authHeaders() }
    );
  }

  private authHeaders(): HttpHeaders {
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
