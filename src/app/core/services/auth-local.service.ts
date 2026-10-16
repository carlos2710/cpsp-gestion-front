import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from "../../../enviroments/environment";


export interface LocalUsuario {
  codLocal: number;
  codEmpresa: number;
  nroOrden: number;
  descLocal: string;
}

export interface LocalRequest {
  idUsuario: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocalService {
  private readonly http = inject(HttpClient);

  obtenerLocales(idUsuario: number): Observable<LocalUsuario[]> {
    const token = sessionStorage.getItem('accessToken');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<LocalUsuario[]>(
      `${environment.apiUrl}logeo/locales`,
      { idUsuario},
      { headers }
    );
  }
}