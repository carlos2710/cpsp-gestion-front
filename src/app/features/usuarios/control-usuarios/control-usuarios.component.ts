import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CrearUsuarioRequest, UsuarioCreadoResponse, UsuariosService } from '../../../core/services/usuarios.service';
import { LocalParametro, ParametrosService } from '../../../core/services/parametros.service';

interface UsuarioFila {
  id: number | string;
  usuario: string;
  nombreUsuario: string;
  perfil: string;
  nombreLocal: string;
  estado: string;
}

function valorSesion(clave: string): number {
  const valor = typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem(clave) || '';
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 0;
}

@Component({
  selector: 'app-control-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './control-usuarios.component.html',
  styleUrl: './control-usuarios.component.scss'
})
export class ControlUsuariosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly parametrosService = inject(ParametrosService);

  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly locales = signal<LocalParametro[]>([]);
  readonly cargandoLocales = signal(false);
  readonly errorLocales = signal('');
  readonly perfiles = [
    { codigo: 1, descripcion: 'Administrador' },
    { codigo: 2, descripcion: 'Colegiatura' },
    { codigo: 3, descripcion: 'Facturacion' },
    { codigo: 4, descripcion: 'Decanato' }
  ];
  readonly filas = signal<UsuarioFila[]>([
    { id: 1, usuario: 'cfernandez', nombreUsuario: 'CARLOS FERNÁNDEZ', perfil: 'ADMINISTRADOR', nombreLocal: 'LOCAL PRINCIPAL', estado: 'ACTIVO' },
    { id: 2, usuario: 'jalva', nombreUsuario: 'JULIANA ALVA', perfil: 'ADMINISTRADOR', nombreLocal: 'LOCAL PRINCIPAL', estado: 'ACTIVO' },
    { id: 3, usuario: 'mrojas', nombreUsuario: 'MARÍA ROJAS', perfil: 'OPERADOR', nombreLocal: 'LOCAL PRINCIPAL', estado: 'ACTIVO' },
    { id: 4, usuario: 'lquispe', nombreUsuario: 'LUIS QUISPE', perfil: 'CONSULTA', nombreLocal: 'LOCAL REGIONAL', estado: 'INACTIVO' }
  ].slice(0, 10));

  readonly formulario = this.fb.nonNullable.group({
    tipoDocumento: ['1', Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(8), Validators.maxLength(8)]],
    apellidoPaterno: ['', Validators.required],
    apellidoMaterno: ['', Validators.required],
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    telefono: [''],
    email: ['', Validators.email],
    locales: this.fb.nonNullable.control<number[]>([], Validators.required),
    perfil: ['', Validators.required],
    tipoUsuario: ['1', Validators.required],
    usuario: ['', Validators.required],
    clave: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    this.cargarLocales();
  }

  abrirModal(): void {
    this.error.set('');
    this.mensaje.set('');
    this.generarClave();
    this.modalAbierto.set(true);
  }

  generarClave(): void {
    const aleatorio = new Uint32Array(1);
    globalThis.crypto.getRandomValues(aleatorio);
    const clave = String(10_000_000 + (aleatorio[0] % 90_000_000));
    this.formulario.controls.clave.setValue(clave);
  }

  private cargarLocales(): void {
    this.cargandoLocales.set(true);
    this.parametrosService.listarLocales().subscribe({
      next: locales => {
        this.locales.set(locales || []);
        this.cargandoLocales.set(false);
        this.errorLocales.set('');
      },
      error: () => {
        this.cargandoLocales.set(false);
        this.errorLocales.set('No se pudieron cargar los locales disponibles.');
      }
    });
  }

  alternarLocal(local: LocalParametro, evento: Event): void {
    const seleccionados = this.formulario.controls.locales.value;
    const marcado = (evento.target as HTMLInputElement).checked;
    this.formulario.controls.locales.setValue(marcado
      ? [...seleccionados, local.loc_codigo]
      : seleccionados.filter(codigo => codigo !== local.loc_codigo));
  }

  localSeleccionado(local: LocalParametro): boolean {
    return this.formulario.controls.locales.value.includes(local.loc_codigo);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  longitudDocumento(): number {
    return this.formulario.controls.tipoDocumento.value === '1' ? 8 : 9;
  }

  actualizarValidacionDocumento(): void {
    const longitud = this.longitudDocumento();
    const control = this.formulario.controls.numeroDocumento;
    control.setValidators([
      Validators.required,
      Validators.pattern(/^\d+$/),
      Validators.minLength(longitud),
      Validators.maxLength(longitud)
    ]);
    control.updateValueAndValidity();
  }

  filtrarNumeroDocumento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '').slice(0, this.longitudDocumento());
    input.value = valor;
    this.formulario.controls.numeroDocumento.setValue(valor);
  }

  guardar(): void {
    this.mensaje.set('');
    this.error.set('');
    if (!this.formulario.controls.locales.value.length) {
      this.formulario.controls.locales.markAsTouched();
      this.error.set('Selecciona al menos un local para el usuario.');
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Revisa los campos obligatorios y corrige los valores indicados.');
      return;
    }

    const empresa = valorSesion('codEmpresa');
    const valores = this.formulario.getRawValue();
    const request: CrearUsuarioRequest = {
      idUsuario: null,
      tipoDocumento: Number(valores.tipoDocumento),
      numeroDocumento: valores.numeroDocumento.trim(),
      apellidoPaterno: valores.apellidoPaterno.trim().toLocaleUpperCase('es-PE'),
      apellidoMaterno: valores.apellidoMaterno.trim().toLocaleUpperCase('es-PE'),
      primerNombre: valores.primerNombre.trim().toLocaleUpperCase('es-PE'),
      segundoNombre: valores.segundoNombre.trim().toLocaleUpperCase('es-PE') || null,
      telefono: valores.telefono.trim() || null,
      email: valores.email.trim() || null,
      locales: valores.locales,
      perfil: Number(valores.perfil),
      codigoEmpresa: empresa || null,
      tipoUsuario: Number(valores.tipoUsuario),
      usuario: valores.usuario.trim(),
      clave: valores.clave
    };

    this.guardando.set(true);
    this.usuariosService.crear(request).subscribe({
      next: respuesta => {
        const creado = respuesta?.data;
        const fila = this.crearFila(creado, request);
        this.filas.update(actuales => [fila, ...actuales].slice(0, 10));
        this.modalAbierto.set(false);
        this.formulario.reset({
          tipoDocumento: '1', numeroDocumento: '', apellidoPaterno: '', apellidoMaterno: '',
          primerNombre: '', segundoNombre: '', telefono: '', email: '', locales: [], perfil: '', tipoUsuario: '1', usuario: '', clave: ''
        });
        this.actualizarValidacionDocumento();
        this.mensaje.set(respuesta?.message || 'Usuario creado correctamente.');
        this.guardando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(this.mensajeError(respuesta));
        this.guardando.set(false);
      }
    });
  }

  private crearFila(creado: UsuarioCreadoResponse | null | undefined, request: CrearUsuarioRequest): UsuarioFila {
    const nombre = [request.primerNombre, request.segundoNombre, request.apellidoPaterno, request.apellidoMaterno]
      .filter(Boolean).join(' ');
    return {
      id: creado?.id ?? `${Date.now()}`,
      usuario: creado?.usuario || request.usuario,
      nombreUsuario: creado?.nombreUsuario || nombre,
      perfil: creado?.perfil || String(request.perfil),
      nombreLocal: this.locales().filter(local => request.locales.includes(local.loc_codigo)).map(local => local.loc_descripcion).join(', ') || creado?.nombreLocal || '',
      estado: creado?.descripcionEstado || 'ACTIVO'
    };
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el servicio de usuarios. Verifica la conexión y CORS.';
    if (error.status === 401 || error.status === 403) return 'Tu sesión no tiene autorización para crear usuarios.';
    if (error.status === 400) return 'El servicio rechazó los datos. Revisa documento, correo, local, perfil y tipo de usuario.';
    return error.error?.message || 'No se pudo crear el usuario. Inténtalo nuevamente.';
  }
}
