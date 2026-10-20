import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface LocalParametro {
  loc_codigo: number;
  loc_descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}parametros/locales`;

  listarLocales(): Observable<LocalParametro[]> {
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    return this.http.get<LocalParametro[]>(this.endpoint, { headers });
  }
}
