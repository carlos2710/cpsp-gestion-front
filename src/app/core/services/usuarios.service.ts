import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface CrearUsuarioRequest {
  idUsuario: number | null;
  tipoDocumento: number;
  numeroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string | null;
  telefono: string | null;
  email: string | null;
  locales: number[];
  perfil: number;
  codigoEmpresa: number | null;
  tipoUsuario: number;
  usuario: string;
  clave: string;
}

export interface UsuarioCreadoResponse {
  id: number;
  usuario: string;
  perfil: string;
  nombreUsuario: string;
  nombreLocal: string;
  descripcionEstado: string;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}usuarios`;

  crear(request: CrearUsuarioRequest): Observable<ApiResponse<UsuarioCreadoResponse>> {
    const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    return this.http.post<ApiResponse<UsuarioCreadoResponse>>(this.endpoint, request, { headers });
  }
}
