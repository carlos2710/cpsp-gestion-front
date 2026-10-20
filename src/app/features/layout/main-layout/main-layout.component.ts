import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { MenuPerfil, MenuService } from '../../../core/services/menu.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { Router } from '@angular/router';

function stored(key: string): string | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
}

@Component({
  selector: 'app-main-layout', standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html', styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  readonly menus = signal<MenuPerfil[]>([]);
  readonly modulosExpandidos = signal<number[]>([]);
  readonly gruposMenu = computed(() => {
    const grupos = new Map<number, { codigoModulo: number; modulo: string; items: MenuPerfil[] }>();
    for (const item of this.menus()) {
      let grupo = grupos.get(item.codigoModulo);
      if (!grupo) {
        grupo = { codigoModulo: item.codigoModulo, modulo: item.modulo, items: [] };
        grupos.set(item.codigoModulo, grupo);
      }
      grupo.items.push(item);
    }
    return [...grupos.values()];
  });
  readonly cargandoMenu = signal(false);
  readonly errorMenu = signal(false);
  readonly colapsado = signal(false);
  readonly nombreLocal = stored('descLocal') || 'Local seleccionado';
  readonly inicialUsuario = (stored('idUsuario') || 'U').slice(0, 1).toUpperCase();

  ngOnInit(): void {
    const perfil = Number(stored('codPerfil'));
    const token = stored('accessToken');
    if (!token || !Number.isInteger(perfil) || perfil <= 0) return;
    this.cargandoMenu.set(true);
    this.menuService.obtenerMenusPorPerfil(perfil)
      .pipe(finalize(() => this.cargandoMenu.set(false)))
      .subscribe({
        next: items => this.menus.set([...items].sort((a, b) => a.orden - b.orden)),
        error: () => this.errorMenu.set(true)
      });
  }

  rutaMenu(menu: MenuPerfil): string[] {
    const modulo = this.normalizar(menu.modulo);
    const submenu = this.normalizar(menu.submenu);
    const ruta = (menu.ruta || '').trim();
    const rutaNormalizada = this.normalizar(ruta).replace(/[\\/._-]+/g, ' ');
    const esControlUsuarios = `${modulo} ${submenu} ${rutaNormalizada}`.includes('usuario');
    const esRegistroSolicitud = (modulo.includes('solicitud') || submenu.includes('solicitud') || rutaNormalizada.includes('solicitud'))
      && (`${submenu} ${rutaNormalizada}`.includes('registr') || `${submenu} ${rutaNormalizada}`.includes('nuevo'));

    if (esControlUsuarios) {
      return ['/app/usuarios'];
    }
    if (esRegistroSolicitud) {
      return ['/app/solicitudes/registrar'];
    }
    if (!ruta) return ['/app/dashboard'];

    // Las rutas de los menús se resuelven dentro de la aplicación Angular.
    // Los valores de BD pueden llegar como /modulo/opcion o modulo/opcion.
    const segmento = ruta.replace(/^\/+|\/+$/g, '');
    if (segmento.toLowerCase() === 'app' || segmento.toLowerCase() === 'app/dashboard') {
      return ['/app/dashboard'];
    }
    return [`/app/${segmento.replace(/^app\//i, '')}`];
  }

  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  tituloPagina(): string {
    if (this.router.url.includes('/solicitudes/registrar')) return 'Registrar solicitud';
    if (this.router.url.includes('/usuarios')) return 'Control de usuarios';
    return 'Dashboard';
  }

  moduloExpandido(codigoModulo: number): boolean {
    return this.modulosExpandidos().includes(codigoModulo);
  }

  alternarModulo(codigoModulo: number): void {
    this.modulosExpandidos.update(expandidos =>
      expandidos.includes(codigoModulo)
        ? expandidos.filter(codigo => codigo !== codigoModulo)
        : [...expandidos, codigoModulo]
    );
  }

  cerrarSesion(): void {
    this.authSession.destroy();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
