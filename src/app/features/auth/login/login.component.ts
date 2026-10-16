
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mostrarPassword = signal(false);
  readonly error = signal('');

  readonly formulario = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', Validators.required]
  });

  ingresar(): void {
    this.error.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);

    this.authService.login(this.formulario.getRawValue())
      .subscribe({
        next: (response) => {
          if (!response.accessToken || !response.usuario) {
            console.error('Respuesta de autenticación incompleta');
            return;
          }

          sessionStorage.setItem('accessToken', response.accessToken);

          sessionStorage.setItem(
            'codLocal',
            String(response.usuario.codLocal)
          );

          sessionStorage.setItem(
            'codEmpresa',
            String(response.usuario.codEmpresa)
          );

          sessionStorage.setItem(
            'codPerfil',
            String(response.usuario.codPerfil)
          );

          sessionStorage.setItem(
            'idUsuario', 
            String(response.usuario.idUsuario)
          );

          this.router.navigate(['/seleccion']);
        },
        error: (err) => {
          this.error.set('Credenciales incorrectas');
          this.cargando.set(false);
        },
        complete: () => {
          this.cargando.set(false);
        }
      });
    
  }

  alternarPassword(): void {
    this.mostrarPassword.update(valor => !valor);
  }
}
