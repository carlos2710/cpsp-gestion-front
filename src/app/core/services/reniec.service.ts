import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface DniReniecData {
  numero: string;
  nombre_completo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  codigo_verificacion: number;
  direccion: string;
  direccion_completa: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo_reniec: string;
  ubigeo_sunat: string;
  ubigeo: string[];
}

export interface BuscarDniReniecResponse {
  success: boolean;
  message: string;
  data: DniReniecData | null;
}

@Injectable({ providedIn: 'root' })
export class ReniecService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}solicitud/BuscarDNI-Reniec`;

  buscarDni(dni: string): Observable<BuscarDniReniecResponse> {
    return this.http.get<BuscarDniReniecResponse>(
      `${this.endpoint}/${encodeURIComponent(dni)}`,
      { headers: this.authHeaders() }
    );
  }

  private authHeaders(): HttpHeaders {
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
