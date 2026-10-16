import { inject, Inject, Injectable } from "@angular/core";
import { environment } from "../../../enviroments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface AccesoRequest {
    userName: string;
    password: string;
}

export interface UsuarioAcceso {
  idUsuario: number;
  userName: string;
  passwordHash: string | null;
  estado: number;
  marca: number;
  codLocal: number;
  codEmpresa: number;
  codPerfil: number;
}

export interface AccesoResponse {
  usuario: UsuarioAcceso;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}logeo`;

    login(request: AccesoRequest) : Observable<AccesoResponse> {
        return this.http.post<AccesoResponse>(this.apiUrl, request);
    }
}