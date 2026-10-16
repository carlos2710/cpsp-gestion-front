
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  LocalService,
  LocalUsuario
} from '../../../core/services/auth-local.service';

@Component({
  selector: 'app-seleccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './seleccion.component.html',
  styleUrl: './seleccion.component.scss'
})
export class SeleccionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly localService = inject(LocalService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal('');
  readonly locales = signal<LocalUsuario[]>([]);

  readonly formulario = this.fb.nonNullable.group({
    codLocal: ['', Validators.required]
  });

  ngOnInit(): void {
    const token = sessionStorage.getItem('accessToken');

    // Ajusta esta clave al nombre real que guardas en el login.
    const idUsuario = Number(sessionStorage.getItem('idUsuario'));

    if (!token || !Number.isInteger(idUsuario) || idUsuario <= 0) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargando.set(true);

    this.localService.obtenerLocales(idUsuario)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.locales.set(
            [...respuesta].sort((a, b) => a.nroOrden - b.nroOrden)
          );
        },
        error: (err) => {
          console.error('Error al consultar locales:', err);
          this.error.set('No fue posible cargar los locales disponibles.');
        }
      });
  }

  continuar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const codLocal = Number(this.formulario.controls.codLocal.value);
    const localSeleccionado = this.locales().find(
      local => local.codLocal === codLocal
    );

    if (!localSeleccionado) {
      this.error.set('Seleccione un local válido.');
      return;
    }

    sessionStorage.setItem(
      'codLocal',
      String(localSeleccionado.codLocal)
    );
    sessionStorage.setItem(
      'codEmpresa',
      String(localSeleccionado.codEmpresa)
    );

    // Temporal: aquí conectaremos la navegación a la pantalla principal.
    console.log('Local seleccionado:', localSeleccionado);
  }
}
