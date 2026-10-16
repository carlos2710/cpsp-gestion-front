import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface Ubicacion {
  codigo: number;
  descripcion: string;
}

export interface Universidad {
  codigo: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}ubicaciones`;

  listarDepartamentos(): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(`${this.baseUrl}/departamentos`, { headers: this.authHeaders() });
  }

  listarProvincias(codigoDepartamento: number): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(`${this.baseUrl}/departamentos/${codigoDepartamento}/provincias`, { headers: this.authHeaders() });
  }

  listarDistritos(codigoProvincia: number): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(`${this.baseUrl}/provincias/${codigoProvincia}/distritos`, { headers: this.authHeaders() });
  }

  listarUniversidades(): Observable<Universidad[]> {
    return this.http.get<Universidad[]>(`${environment.apiUrl}universidades`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
