import { Injectable } from '@angular/core';

const SESSION_KEYS = [
  'accessToken',
  'accessTokenExpiresAt',
  'idUsuario',
  'codPerfil',
  'codEmpresa',
  'codLocal',
  'descLocal'
];

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  isAuthenticated(): boolean {
    const token = this.get('accessToken');
    const idUsuario = Number(this.get('idUsuario'));
    const codPerfil = Number(this.get('codPerfil'));
    if (!token || !Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(codPerfil) || codPerfil <= 0) {
      return false;
    }

    const expiresAt = Number(this.get('accessTokenExpiresAt'));
    if (Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() >= expiresAt) {
      this.destroy();
      return false;
    }
    return true;
  }

  hasLocalContext(): boolean {
    const local = Number(this.get('codLocal'));
    const empresa = Number(this.get('codEmpresa'));
    return Number.isInteger(local) && local > 0 && Number.isInteger(empresa) && empresa > 0;
  }

  destroy(): void {
    if (typeof sessionStorage === 'undefined') return;
    for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  }

  private get(key: string): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
  }
}
