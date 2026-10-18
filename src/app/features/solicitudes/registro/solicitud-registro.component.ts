import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Ubicacion, UbicacionService, Universidad } from '../../../core/services/ubicacion.service';
import { ReniecService } from '../../../core/services/reniec.service';

interface OpcionFormulario {
  codigo: string;
  descripcion: string;
}

const catalogosFormulario = {
  tipoDocumento: [
    { codigo: '1', descripcion: 'DNI' }, { codigo: '2', descripcion: 'Carnet de extranjería' },
    { codigo: '3', descripcion: 'RUC' }, { codigo: '4', descripcion: 'Pasaporte' }
  ],
  sexo: [{ codigo: 'FEM', descripcion: 'Femenino' }, { codigo: 'MAS', descripcion: 'Masculino' }],
  nacionalidad: [{ codigo: 'PE', descripcion: 'Peruana' }, { codigo: 'EXT', descripcion: 'Extranjera' }],
  estadoCivil: [
    { codigo: 'SOL', descripcion: 'Soltero(a)' }, { codigo: 'CAS', descripcion: 'Casado(a)' },
    { codigo: 'VIU', descripcion: 'Viudo(a)' }, { codigo: 'CON', descripcion: 'Conviviente' },
    { codigo: 'DIV', descripcion: 'Divorciado(a)' }, { codigo: 'SEP', descripcion: 'Separado(a)' }
  ],
  grupoSanguineo: ['A-', 'A+', 'AB-', 'AB+', 'B-', 'B+', 'O-', 'O+'].map(valor => ({ codigo: valor, descripcion: valor })),
  formaObtencion: [
    { codigo: 'TESIS', descripcion: 'Tesis' }, { codigo: 'CASO_CLINICO', descripcion: 'Caso clínico' },
    { codigo: 'EXAMEN_GRADO', descripcion: 'Examen de grado' }, { codigo: 'OTRO', descripcion: 'Otro' }
  ],
  areaEspecializacion: ['Clínica', 'Educacional', 'Social', 'Organizacional', 'Comunitaria', 'Deportiva', 'Jurídica', 'Otra']
    .map(valor => ({ codigo: valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toUpperCase(), descripcion: valor })),
  ejerceActualmente: [{ codigo: 'SI', descripcion: 'Sí' }, { codigo: 'NO', descripcion: 'No' }],
  tipoActividad: [
    { codigo: 'CONSULTORIO', descripcion: 'Consultorio' }, { codigo: 'INSTITUTO', descripcion: 'Instituto' },
    { codigo: 'CENTRO_EDUCATIVO', descripcion: 'Centro educativo' }, { codigo: 'OTRO', descripcion: 'Otro' }
  ],
  sector: [{ codigo: 'PUBLICO', descripcion: 'Público' }, { codigo: 'PRIVADO', descripcion: 'Privado' }, { codigo: 'OTRO', descripcion: 'Otro' }],
  jornada: [{ codigo: 'PARCIAL', descripcion: 'Parcial' }, { codigo: 'COMPLETO', descripcion: 'Completo' }],
  areaCapacitacion: ['Clínica', 'Educacional', 'Social', 'Organizacional', 'Comunitaria', 'Deportiva', 'Jurídica', 'Otra']
    .map(valor => ({ codigo: valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toUpperCase(), descripcion: valor }))
} satisfies Record<string, OpcionFormulario[]>;

function resolverOpcion(opciones: readonly OpcionFormulario[], valor: string): OpcionFormulario | null {
  return opciones.find(opcion => opcion.codigo === valor || opcion.descripcion === valor) ?? null;
}

function stored(key: string): string {
  return typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem(key) || '';
}

function fechaInput(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function fechaNacimientoMinimaEdad(maxima: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string;
    return valor && valor > maxima ? { edadMenorA20: true } : null;
  };
}

function fechaNoFutura(maxima: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string;
    return valor && valor > maxima ? { fechaFutura: true } : null;
  };
}

function operacionesUnicas(control: AbstractControl): ValidationErrors | null {
  const pagos = Array.isArray(control.value) ? control.value as Array<{ numeroOperacion?: string }> : [];
  const operaciones = pagos
    .map(pago => String(pago.numeroOperacion ?? '').trim().toLocaleLowerCase('es-PE'))
    .filter(Boolean);
  return new Set(operaciones).size === operaciones.length ? null : { numeroOperacionDuplicado: true };
}

function correoConDominio(control: AbstractControl): ValidationErrors | null {
  const correo = String(control.value ?? '');
  if (!correo) return null;

  const partes = correo.split('@');
  if (partes.length !== 2) return { correoInvalido: true };
  const [usuario, dominio] = partes;
  const etiquetas = dominio.split('.');
  const usuarioValido = usuario.length <= 64
    && !usuario.startsWith('.')
    && !usuario.endsWith('.')
    && !usuario.includes('..')
    && /^[a-z0-9._%+-]+$/i.test(usuario);
  const dominioValido = etiquetas.length >= 2
    && etiquetas.every(etiqueta => etiqueta.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(etiqueta))
    && /^[a-z]{2,}$/i.test(etiquetas[etiquetas.length - 1]);

  return correo.length <= 254 && usuarioValido && dominioValido ? null : { correoInvalido: true };
}

@Component({
  selector: 'app-solicitud-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitud-registro.component.html',
  styleUrl: './solicitud-registro.component.scss'
})
export class SolicitudRegistroComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ubicacionService = inject(UbicacionService);
  private readonly reniecService = inject(ReniecService);
  private solicitudReniec = 0;
  private ultimoDniConsultado = '';
  private solicitudProvincias = 0;
  private solicitudDistritos = 0;
  readonly mensaje = signal('');
  readonly departamentos = signal<Ubicacion[]>([]);
  readonly provincias = signal<Ubicacion[]>([]);
  readonly distritos = signal<Ubicacion[]>([]);
  readonly cargandoDepartamentos = signal(false);
  readonly cargandoProvincias = signal(false);
  readonly cargandoDistritos = signal(false);
  readonly errorUbicaciones = signal('');
  readonly estadoReniec = signal('');
  readonly consultandoReniec = signal(false);
  readonly universidades = signal<Universidad[]>([]);
  readonly buscandoUniversidad = signal(false);
  readonly registrandoUniversidad = signal(false);
  readonly textoUniversidad = signal('');
  readonly listaUniversidadesAbierta = signal(false);
  readonly errorUniversidades = signal('');
  readonly nombreLocal = stored('descLocal') || 'Local seleccionado';
  readonly fechaHoy = fechaInput(new Date());
  readonly fechaMaximaNacimiento = (() => {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - 20);
    return fechaInput(fecha);
  })();
  readonly horaActual = new Date().toTimeString().slice(0, 5);
  readonly paso = signal(0);
  readonly pasoMaximo = signal(0);
  readonly hijosVisibles = signal(0);
  readonly hijos = [1, 2, 3, 4];
  readonly archivos = signal<Record<string, string>>({});
  readonly archivosSeleccionados = signal<Record<string, File>>({});
  readonly previsualizaciones = signal<Record<string, string>>({});
  readonly payloadPreparado = signal<Record<string, unknown> | null>(null);
  readonly seccionesAcademicas = signal({ revalidacion: false, maestria: false, doctorado: false, idioma: false, otrosEstudios: false });
  readonly pasos = ['Datos generales', 'Académico', 'Profesional', 'Otras actividades', 'Necesidad y bienestar', 'Comprobantes'];
  readonly comprobantes = [
    { id: 'cdn', nombre: 'Derecho de colegiatura CDN', monto: 'S/ 432.60' },
    { id: 'fondo', nombre: 'Fondo mutual', monto: 'S/ 30.90' },
    { id: 'cuota', nombre: 'Cuota extraordinaria', monto: 'S/ 50.00' },
    { id: 'cdr', nombre: 'Derecho de colegiatura CDR', monto: 'S/ 1,081.50' }
  ];
  readonly documentos = [
    { id: 'foto', nombre: 'Foto del colegiado', tipo: 'Imagen JPG o PNG' },
    { id: 'firma', nombre: 'Firma del colegiado', tipo: 'Imagen JPG o PNG' },
    { id: 'dni', nombre: 'Documento de identidad', tipo: 'Archivo PDF' },
    { id: 'diploma', nombre: 'Diploma de licenciamiento', tipo: 'Archivo PDF' },
    { id: 'antecedentes', nombre: 'Antecedentes', tipo: 'Archivo PDF' }
  ];

  readonly formulario = this.fb.nonNullable.group({
    datosSolicitud: this.fb.nonNullable.group({
      fechaRecepcion: [this.fechaHoy, Validators.required],
      horaRecepcion: [this.horaActual, Validators.required]
    }),
    general: this.fb.nonNullable.group({
      apellidoP: ['', Validators.required], apellidoM: [''],
      nombre1: ['', Validators.required], nombre2: [''], fechaNacimiento: ['', [Validators.required, fechaNacimientoMinimaEdad(this.fechaMaximaNacimiento)]],
      codTipoDocumento: ['1', Validators.required], numeroDocumento: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      numeroRUC: [''], celular1: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]], celular2: [''], fijo: [''],
      correo1: ['', [Validators.required, correoConDominio]], correo2: ['', correoConDominio],
      codDepartamento: [''], codProvincia: [''], codDistrito: [''], sexo: [''], nacionalidad: ['Peruana'],
      domicilio: ['', Validators.required], numero: ['1'], urbanizacion: [''], codPostal: [''],
      codEstadoCivil: ['', Validators.required], codGrupoSang: ['', Validators.required],
      nombreConyugue: [''], profesionConyugue: [''],
      hijo1Nombre: [''], hijo1Sexo: [''], hijo1Edad: [''], hijo1Ocupacion: [''],
      hijo2Nombre: [''], hijo2Sexo: [''], hijo2Edad: [''], hijo2Ocupacion: [''],
      hijo3Nombre: [''], hijo3Sexo: [''], hijo3Edad: [''], hijo3Ocupacion: [''],
      hijo4Nombre: [''], hijo4Sexo: [''], hijo4Edad: [''], hijo4Ocupacion: ['']
    }),
    datosAcademicos: this.fb.nonNullable.group({
      codUniversidad: ['', Validators.required], tituloObtenido: ['', Validators.required], codObtencion: [''],
      fechaObtencion: ['', fechaNoFutura(this.fechaHoy)], areaEspecializacion: [''], titulo: [''],
      datosRevalidacion: [''], revalidacionInstitucion: [''], revalidacionTitulo: [''], revalidacionLugar: [''], revalidacionFecha: [''], revalidacionOtorgadoPor: [''], revalidacionLugarOtorgamiento: [''], revalidacionFechaOtorgamiento: [''],
      datosMaestria: [''], maestriaNombre: [''], maestriaMencion: [''], maestriaUniversidad: [''], maestriaTiempo: [''], maestriaFecha: [''], maestriaTituloTesis: [''],
      datosDoctorado: [''], doctoradoNombre: [''], doctoradoMencion: [''], doctoradoUniversidad: [''], doctoradoTiempo: [''], doctoradoFecha: [''], doctoradoTituloTesis: [''],
      datosIdioma: [''], idioma: [''], idiomaCentro: [''], idiomaTiempo: [''], idiomaCertificado: [''],
      datosOtrosEstudios: [''], estudio1Nombre: [''], estudio1Centro: [''], estudio1Tiempo: [''], estudio1Certificado: [''], estudio2Nombre: [''], estudio2Centro: [''], estudio2Tiempo: [''], estudio2Certificado: ['']
    }),
    actividadProfesional: this.fb.nonNullable.group({
      codEjerce: ['true'], institucionTrabajo: [''], institucionTrabajo2: [''], actividadParticular: [''], actividadParticular2: [''],
      trabajoPrincipal: this.fb.nonNullable.group({ nombreInstitucion: [''], sector: [''], cargo: [''], jornada: [''], tiempoServicio: [''], direccion: [''], telefono: [''], nota: [''] }),
      trabajoAdicional: this.fb.nonNullable.group({ nombreInstitucion: [''], sector: [''], cargo: [''], jornada: [''], tiempoServicio: [''], direccion: [''], telefono: [''], nota: [''] })
    }),
    necesidadCapacitacion: this.fb.nonNullable.group({
      otros: [''], listTemas: [''], listBienestar: [''], otrosBienestar: ['']
    }),
    comprobantesPago: this.fb.nonNullable.array(
      this.comprobantes.map(() => this.fb.nonNullable.group({
        numeroOperacion: [''], fechaVoucher: ['', fechaNoFutura(this.fechaHoy)]
      })),
      { validators: operacionesUnicas }
    )
  });

  readonly otrasActividades = this.fb.nonNullable.group({
    actividad1Tipo: [''], actividad1Otro: [''], actividad1Tiempo: [''], actividad1Cargo: [''], actividad1Direccion: [''], actividad1Telefono: [''],
    actividad2Tipo: [''], actividad2Otro: [''], actividad2Tiempo: [''], actividad2Cargo: [''], actividad2Direccion: [''], actividad2Telefono: ['']
  });

  readonly bienestar = this.fb.nonNullable.group({
    area: this.fb.nonNullable.control<string[]>([]), tema1: [''], tema2: [''], tema3: [''], aspectos: [''], otro: ['']
  });

  constructor() {
    this.formulario.controls.datosSolicitud.controls.fechaRecepcion.disable();
    this.formulario.controls.datosSolicitud.controls.horaRecepcion.disable();
    this.formulario.controls.general.controls.codProvincia.disable();
    this.formulario.controls.general.controls.codDistrito.disable();
    this.actualizarValidacionDocumento();
    this.cargarDepartamentos();
    this.cargarUniversidades();
  }

  ngOnDestroy(): void {
    Object.values(this.previsualizaciones()).forEach(url => URL.revokeObjectURL(url));
  }

  private cargarUniversidades(): void {
    this.buscandoUniversidad.set(true);
    this.ubicacionService.listarUniversidades().subscribe({
      next: universidades => {
        this.universidades.set(universidades);
        this.buscandoUniversidad.set(false);
      },
      error: () => {
        this.errorUniversidades.set('No se pudo cargar el catálogo de universidades.');
        this.buscandoUniversidad.set(false);
      }
    });
  }

  universidadesFiltradas(): Universidad[] {
    const consulta = this.normalizarNombreUniversidad(this.textoUniversidad().trim());
    const resultados = consulta
      ? this.universidades().filter(item => this.normalizarNombreUniversidad(item.nombre).includes(consulta))
      : this.universidades();
    return resultados.slice(0, 50);
  }

  private normalizarNombreUniversidad(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
  }

  buscarUniversidad(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.textoUniversidad.set(texto);
    this.listaUniversidadesAbierta.set(true);
    this.errorUniversidades.set('');
    this.formulario.controls.datosAcademicos.controls.codUniversidad.setValue('');
  }

  registrarUniversidad(): void {
    const nombre = this.textoUniversidad().trim().replace(/\s+/g, ' ');
    if (!nombre || this.registrandoUniversidad() || this.buscandoUniversidad()) return;

    const nombreNormalizado = this.normalizarNombreUniversidad(nombre);
    const existente = this.universidades().find(item => this.normalizarNombreUniversidad(item.nombre) === nombreNormalizado);
    if (existente) {
      this.seleccionarUniversidad(existente);
      return;
    }

    this.registrandoUniversidad.set(true);
    this.errorUniversidades.set('');
    this.ubicacionService.registrarUniversidad(nombre).subscribe({
      next: () => this.ubicacionService.listarUniversidades().subscribe({
        next: universidades => {
          this.universidades.set(universidades);
          const registrada = universidades.find(item => this.normalizarNombreUniversidad(item.nombre) === nombreNormalizado);
          this.registrandoUniversidad.set(false);
          if (registrada) {
            this.seleccionarUniversidad(registrada);
          } else {
            this.errorUniversidades.set('La universidad se registró, pero no apareció en el catálogo. Vuelve a buscarla.');
          }
        },
        error: () => {
          this.registrandoUniversidad.set(false);
          this.errorUniversidades.set('La universidad se registró, pero no se pudo actualizar el catálogo.');
          this.cargarUniversidades();
        }
      }),
      error: () => {
        this.registrandoUniversidad.set(false);
        this.errorUniversidades.set('No se pudo registrar la universidad. Verifica el nombre e inténtalo nuevamente.');
      }
    });
  }

  seleccionarUniversidad(universidad: Universidad): void {
    this.formulario.controls.datosAcademicos.controls.codUniversidad.setValue(String(universidad.codigo));
    this.textoUniversidad.set(universidad.nombre);
    this.listaUniversidadesAbierta.set(false);
    this.errorUniversidades.set('');
  }

  cerrarListaUniversidades(): void {
    this.listaUniversidadesAbierta.set(false);
  }

  actualizarValidacionDocumento(): void {
    const control = this.formulario.controls.general.controls.numeroDocumento;
    const longitud = this.longitudDocumento();
    control.setValidators([Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(longitud), Validators.maxLength(longitud)]);
    control.updateValueAndValidity();
    this.solicitudReniec++;
    this.consultandoReniec.set(false);
    this.estadoReniec.set('');
    if (this.formulario.controls.general.controls.codTipoDocumento.value !== '1') this.ultimoDniConsultado = '';
  }

  consultarDniSiCorresponde(): void {
    const general = this.formulario.controls.general;
    const dni = general.controls.numeroDocumento.value.trim();
    if (general.controls.codTipoDocumento.value !== '1' || !/^[0-9]{8}$/.test(dni)) return;
    if (dni === this.ultimoDniConsultado) return;

    const solicitud = ++this.solicitudReniec;
    this.consultandoReniec.set(true);
    this.estadoReniec.set('Consultando datos en RENIEC…');
    this.reniecService.buscarDni(dni).subscribe({
      next: respuesta => {
        if (solicitud !== this.solicitudReniec) return;
        if (general.controls.codTipoDocumento.value !== '1' || general.controls.numeroDocumento.value !== dni) {
          this.consultandoReniec.set(false);
          this.estadoReniec.set('');
          return;
        }
        this.consultandoReniec.set(false);
        const datos = respuesta?.data;
        if (!respuesta?.success || !datos) {
          this.estadoReniec.set(respuesta?.message || 'No se encontraron datos para el DNI ingresado.');
          return;
        }

        const nombres = String(datos.nombres || datos.nombre_completo || '').trim().replace(/\s+/g, ' ');
        const [primerNombre = '', ...restoNombres] = nombres.split(' ');
        general.patchValue({
          apellidoP: String(datos.apellido_paterno || '').toLocaleUpperCase('es-PE'),
          apellidoM: String(datos.apellido_materno || '').toLocaleUpperCase('es-PE'),
          nombre1: primerNombre.toLocaleUpperCase('es-PE'),
          nombre2: restoNombres.join(' ').toLocaleUpperCase('es-PE'),
          domicilio: String(datos.direccion || datos.direccion_completa || '').toLocaleUpperCase('es-PE')
        });
        this.ultimoDniConsultado = dni;
        this.estadoReniec.set('Datos personales completados con RENIEC.');
      },
      error: () => {
        if (solicitud !== this.solicitudReniec) return;
        this.consultandoReniec.set(false);
        this.estadoReniec.set('No se pudo consultar RENIEC. Verifica el DNI e inténtalo nuevamente.');
      }
    });
  }

  longitudDocumento(): number {
    return this.formulario.controls.general.controls.codTipoDocumento.value === '1' ? 8 : 9;
  }

  filtrarDigitos(evento: Event, campo: 'numeroDocumento' | 'celular1'): void {
    const input = evento.target as HTMLInputElement;
    const maximo = campo === 'numeroDocumento' ? this.longitudDocumento() : 9;
    const digitos = input.value.replace(/[^0-9]/g, '').slice(0, maximo);
    if (input.value !== digitos) input.value = digitos;
    this.formulario.controls.general.controls[campo].setValue(digitos);
    if (campo === 'numeroDocumento' && this.consultandoReniec()) {
      this.solicitudReniec++;
      this.consultandoReniec.set(false);
      this.estadoReniec.set('');
    }
  }

  ejerceActualmente(): boolean {
    return this.formulario.controls.actividadProfesional.controls.codEjerce.value === 'true';
  }

  alternarSeccionAcademica(seccion: 'revalidacion' | 'maestria' | 'doctorado' | 'idioma' | 'otrosEstudios'): void {
    this.seccionesAcademicas.update(actual => ({ ...actual, [seccion]: !actual[seccion] }));
  }

  areaCapacitacionIncluyeOtra(): boolean {
    return this.bienestar.controls.area.value.includes('Otra');
  }

  alCambiarAreasCapacitacion(): void {
    if (!this.areaCapacitacionIncluyeOtra()) this.bienestar.controls.otro.setValue('');
  }

  private cargarDepartamentos(): void {
    this.cargandoDepartamentos.set(true);
    this.ubicacionService.listarDepartamentos().subscribe({
      next: departamentos => {
        this.departamentos.set(departamentos);
        this.cargandoDepartamentos.set(false);
      },
      error: () => {
        this.cargandoDepartamentos.set(false);
        this.errorUbicaciones.set('No se pudieron cargar los departamentos. Intenta nuevamente.');
      }
    });
  }

  cargarProvincias(): void {
    const general = this.formulario.controls.general;
    const codigoDepartamento = Number(general.controls.codDepartamento.value);
    const solicitud = ++this.solicitudProvincias;
    this.solicitudDistritos++;
    this.cargandoProvincias.set(false);
    this.cargandoDistritos.set(false);
    general.controls.codProvincia.setValue('');
    general.controls.codDistrito.setValue('');
    general.controls.codProvincia.disable();
    general.controls.codDistrito.disable();
    this.provincias.set([]);
    this.distritos.set([]);
    this.errorUbicaciones.set('');
    if (!Number.isInteger(codigoDepartamento) || codigoDepartamento <= 0) return;

    this.cargandoProvincias.set(true);
    this.ubicacionService.listarProvincias(codigoDepartamento).subscribe({
      next: provincias => {
        if (solicitud !== this.solicitudProvincias) return;
        this.provincias.set(provincias);
        this.cargandoProvincias.set(false);
        if (provincias.length) general.controls.codProvincia.enable();
      },
      error: () => {
        if (solicitud !== this.solicitudProvincias) return;
        this.cargandoProvincias.set(false);
        this.errorUbicaciones.set('No se pudieron cargar las provincias del departamento seleccionado.');
      }
    });
  }

  cargarDistritos(): void {
    const general = this.formulario.controls.general;
    const codigoProvincia = Number(general.controls.codProvincia.value);
    const solicitud = ++this.solicitudDistritos;
    this.cargandoDistritos.set(false);
    general.controls.codDistrito.setValue('');
    general.controls.codDistrito.disable();
    this.distritos.set([]);
    this.errorUbicaciones.set('');
    if (!Number.isInteger(codigoProvincia) || codigoProvincia <= 0) return;

    this.cargandoDistritos.set(true);
    this.ubicacionService.listarDistritos(codigoProvincia).subscribe({
      next: distritos => {
        if (solicitud !== this.solicitudDistritos) return;
        this.distritos.set(distritos);
        this.cargandoDistritos.set(false);
        if (distritos.length) general.controls.codDistrito.enable();
      },
      error: () => {
        if (solicitud !== this.solicitudDistritos) return;
        this.cargandoDistritos.set(false);
        this.errorUbicaciones.set('No se pudieron cargar los distritos de la provincia seleccionada.');
      }
    });
  }

  forzarMayusculas(evento: Event, campo: 'apellidoP' | 'apellidoM' | 'nombre1' | 'nombre2'): void {
    const input = evento.target as HTMLInputElement;
    const valorMayusculas = input.value.toLocaleUpperCase('es-PE');
    if (input.value !== valorMayusculas) {
      const posicion = input.selectionStart;
      input.value = valorMayusculas;
      this.formulario.controls.general.controls[campo].setValue(valorMayusculas);
      input.setSelectionRange(posicion, posicion);
    }
  }

  forzarTituloMayusculas(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valorMayusculas = input.value.toLocaleUpperCase('es-PE');
    if (input.value !== valorMayusculas) {
      const posicion = input.selectionStart;
      input.value = valorMayusculas;
      this.formulario.controls.datosAcademicos.controls.tituloObtenido.setValue(valorMayusculas);
      input.setSelectionRange(posicion, posicion);
    }
  }

  siguiente(): void {
    if (this.paso() === 0 && this.formulario.controls.general.invalid) {
      const general = this.formulario.controls.general;
      general.markAllAsTouched();
      if (general.controls.correo1.hasError('correoInvalido')) {
        this.mensaje.set('El correo electrónico debe tener un formato válido, por ejemplo nombre@dominio.com.');
      } else if (general.controls.correo2.hasError('correoInvalido')) {
        this.mensaje.set('El correo alternativo no tiene un formato válido.');
      } else if (general.controls.correo1.hasError('required')) {
        this.mensaje.set('El correo electrónico es obligatorio.');
      } else {
        this.mensaje.set('Completa o corrige los campos obligatorios de datos generales para continuar.');
      }
      return;
    }
    if (this.paso() === 1 && this.formulario.controls.datosAcademicos.invalid) {
      this.formulario.controls.datosAcademicos.markAllAsTouched();
      this.mensaje.set('Selecciona la universidad y completa el título obtenido para continuar.');
      return;
    }
    const siguiente = Math.min(this.paso() + 1, this.pasos.length - 1);
    this.paso.set(siguiente);
    this.pasoMaximo.update(maximo => Math.max(maximo, siguiente));
    this.mensaje.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  anterior(): void {
    this.paso.update(actual => Math.max(0, actual - 1));
    this.mensaje.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  irAlPaso(indice: number): void {
    if (indice <= this.pasoMaximo()) this.paso.set(indice);
  }

  agregarHijo(): void {
    this.hijosVisibles.update(cantidad => Math.min(cantidad + 1, this.hijos.length));
  }

  alElegirArchivo(evento: Event, clave: string): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.archivos.update(actual => ({ ...actual, [clave]: archivo.name }));
    this.archivosSeleccionados.update(actual => ({ ...actual, [clave]: archivo }));
    const previsualizacionAnterior = this.previsualizaciones()[clave];
    if (previsualizacionAnterior) URL.revokeObjectURL(previsualizacionAnterior);
    if (archivo.type.startsWith('image/')) {
      const url = URL.createObjectURL(archivo);
      this.previsualizaciones.update(actual => ({ ...actual, [clave]: url }));
    } else {
      this.previsualizaciones.update(actual => {
        const siguiente = { ...actual };
        delete siguiente[clave];
        return siguiente;
      });
    }
  }

  revisarRegistro(): void {
    const pagos = this.formulario.controls.comprobantesPago;
    if (pagos.invalid) {
      pagos.markAllAsTouched();
      this.mensaje.set(pagos.hasError('numeroOperacionDuplicado')
        ? 'El número de operación no puede repetirse entre los comprobantes.'
        : 'Corrige las fechas de voucher para continuar.');
      return;
    }
    this.payloadPreparado.set(this.prepararPayloadFormulario());
    this.mensaje.set('Formulario completado. El envío se habilitará cuando conectemos el servicio de registro.');
  }

  prepararPayloadFormulario(): Record<string, unknown> {
    const valores = this.formulario.getRawValue();
    const general = valores.general;
    const academicos = valores.datosAcademicos;
    const actividad = valores.actividadProfesional;
    const opcionUbicacion = (codigo: string, lista: Ubicacion[]) => {
      const encontrada = lista.find(item => item.codigo === Number(codigo));
      return encontrada ? { codigo: encontrada.codigo, descripcion: encontrada.descripcion } : null;
    };
    const opcionUniversidad = this.universidades().find(item => item.codigo === Number(academicos.codUniversidad));
    const hijos = this.hijos.map(numero => {
      const nombre = general[`hijo${numero}Nombre` as keyof typeof general] as string;
      const sexo = general[`hijo${numero}Sexo` as keyof typeof general] as string;
      const edad = general[`hijo${numero}Edad` as keyof typeof general] as string;
      const ocupacion = general[`hijo${numero}Ocupacion` as keyof typeof general] as string;
      return { nombre, sexo: resolverOpcion(catalogosFormulario.sexo, sexo), edad, ocupacion };
    }).filter(hijo => hijo.nombre || hijo.sexo || hijo.edad || hijo.ocupacion);
    const obtenerArchivo = (clave: string) => {
      const archivo = this.archivosSeleccionados()[clave];
      return archivo ? { nombre: archivo.name, tipoMime: archivo.type, tamanoBytes: archivo.size } : null;
    };
    const obtenerTrabajo = (trabajo: typeof actividad.trabajoPrincipal) => ({
      nombreInstitucion: trabajo.nombreInstitucion,
      sector: resolverOpcion(catalogosFormulario.sector, trabajo.sector),
      cargo: trabajo.cargo,
      jornada: resolverOpcion(catalogosFormulario.jornada, trabajo.jornada),
      tiempoServicio: trabajo.tiempoServicio,
      direccion: trabajo.direccion,
      telefono: trabajo.telefono,
      nota: trabajo.nota
    });
    const actividadesNoProfesionales = [1, 2].map(numero => {
      const tipo = String(this.otrasActividades.get(`actividad${numero}Tipo`)?.value ?? '');
      return {
        tipo: resolverOpcion(catalogosFormulario.tipoActividad, tipo),
        otro: this.otrasActividades.get(`actividad${numero}Otro`)?.value || '',
        tiempoFuncionamiento: this.otrasActividades.get(`actividad${numero}Tiempo`)?.value || '',
        cargo: this.otrasActividades.get(`actividad${numero}Cargo`)?.value || '',
        direccion: this.otrasActividades.get(`actividad${numero}Direccion`)?.value || '',
        telefono: this.otrasActividades.get(`actividad${numero}Telefono`)?.value || ''
      };
    });
    const areasCapacitacion = this.bienestar.controls.area.value
      .map(area => resolverOpcion(catalogosFormulario.areaCapacitacion, area))
      .filter((area): area is OpcionFormulario => area !== null);
    const pagos = this.formulario.controls.comprobantesPago.getRawValue();

    return {
      solicitud: {
        local: { codigo: Number(stored('codLocal')) || null, descripcion: this.nombreLocal },
        fechaRecepcion: valores.datosSolicitud.fechaRecepcion,
        horaRecepcion: valores.datosSolicitud.horaRecepcion
      },
      datosGenerales: {
        apellidoPaterno: general.apellidoP,
        apellidoMaterno: general.apellidoM,
        primerNombre: general.nombre1,
        segundoNombre: general.nombre2,
        tipoDocumento: resolverOpcion(catalogosFormulario.tipoDocumento, general.codTipoDocumento),
        numeroDocumento: general.numeroDocumento,
        numeroRuc: general.numeroRUC,
        fechaNacimiento: general.fechaNacimiento,
        sexo: resolverOpcion(catalogosFormulario.sexo, general.sexo),
        nacionalidad: resolverOpcion(catalogosFormulario.nacionalidad, general.nacionalidad),
        ubicacion: {
          departamento: opcionUbicacion(general.codDepartamento, this.departamentos()),
          provincia: opcionUbicacion(general.codProvincia, this.provincias()),
          distrito: opcionUbicacion(general.codDistrito, this.distritos())
        },
        domicilio: general.domicilio,
        numero: general.numero,
        urbanizacion: general.urbanizacion,
        codigoPostal: general.codPostal,
        correoElectronico: general.correo1,
        correoAlternativo: general.correo2,
        celularPrincipal: general.celular1,
        celularAlternativo: general.celular2,
        telefonoFijo: general.fijo,
        estadoCivil: resolverOpcion(catalogosFormulario.estadoCivil, general.codEstadoCivil),
        grupoSanguineo: resolverOpcion(catalogosFormulario.grupoSanguineo, general.codGrupoSang),
        conyuge: { nombre: general.nombreConyugue, profesionOcupacion: general.profesionConyugue },
        hijos
      },
      datosAcademicos: {
        universidad: opcionUniversidad ? { codigo: opcionUniversidad.codigo, descripcion: opcionUniversidad.nombre } : null,
        tituloObtenido: academicos.tituloObtenido,
        formaObtencion: resolverOpcion(catalogosFormulario.formaObtencion, academicos.codObtencion),
        fechaObtencion: academicos.fechaObtencion,
        areaEspecializacion: resolverOpcion(catalogosFormulario.areaEspecializacion, academicos.areaEspecializacion),
        tituloArea: academicos.titulo,
        seccionesVisibles: this.seccionesAcademicas(),
        revalidacion: {
          institucionOrigen: academicos.revalidacionInstitucion, tituloObtenido: academicos.revalidacionTitulo,
          lugar: academicos.revalidacionLugar, fecha: academicos.revalidacionFecha,
          otorgadoPor: academicos.revalidacionOtorgadoPor, lugarOtorgamiento: academicos.revalidacionLugarOtorgamiento,
          fechaOtorgamiento: academicos.revalidacionFechaOtorgamiento
        },
        maestria: {
          nombre: academicos.maestriaNombre, mencion: academicos.maestriaMencion, universidad: academicos.maestriaUniversidad,
          tiempoEstudio: academicos.maestriaTiempo, fecha: academicos.maestriaFecha, tituloTesis: academicos.maestriaTituloTesis
        },
        doctorado: {
          nombre: academicos.doctoradoNombre, mencion: academicos.doctoradoMencion, universidad: academicos.doctoradoUniversidad,
          tiempoEstudio: academicos.doctoradoTiempo, fecha: academicos.doctoradoFecha, tituloTesis: academicos.doctoradoTituloTesis
        },
        idioma: {
          nombre: academicos.idioma, centroEstudios: academicos.idiomaCentro, tiempoEstudio: academicos.idiomaTiempo,
          certificado: academicos.idiomaCertificado
        },
        otrosEstudios: [
          { nombre: academicos.estudio1Nombre, centroEstudios: academicos.estudio1Centro, tiempoEstudio: academicos.estudio1Tiempo, certificado: academicos.estudio1Certificado },
          { nombre: academicos.estudio2Nombre, centroEstudios: academicos.estudio2Centro, tiempoEstudio: academicos.estudio2Tiempo, certificado: academicos.estudio2Certificado }
        ]
      },
      actividadProfesional: {
        ejerceActualmente: resolverOpcion(catalogosFormulario.ejerceActualmente, actividad.codEjerce === 'true' ? 'SI' : 'NO'),
        institucionPrincipal: actividad.institucionTrabajo,
        institucionAdicional: actividad.institucionTrabajo2,
        actividadParticular: actividad.actividadParticular,
        otraActividadParticular: actividad.actividadParticular2,
        trabajos: [obtenerTrabajo(actividad.trabajoPrincipal), obtenerTrabajo(actividad.trabajoAdicional)]
      },
      otrasActividades: actividadesNoProfesionales,
      necesidadCapacitacionBienestar: {
        areas: areasCapacitacion,
        otraArea: this.bienestar.controls.otro.value,
        temasInteres: [this.bienestar.controls.tema1.value, this.bienestar.controls.tema2.value, this.bienestar.controls.tema3.value].filter(Boolean),
        aspectosBienestar: this.bienestar.controls.aspectos.value
      },
      comprobantes: this.comprobantes.map((comprobante, indice) => ({
        codigo: comprobante.id,
        descripcion: comprobante.nombre,
        monto: comprobante.monto,
        numeroOperacion: pagos[indice]?.numeroOperacion ?? '',
        fechaVoucher: pagos[indice]?.fechaVoucher ?? '',
        archivo: obtenerArchivo(comprobante.id)
      })),
      documentos: this.documentos.map(documento => ({
        codigo: documento.id,
        descripcion: documento.nombre,
        archivo: obtenerArchivo(documento.id)
      }))
    };
  }

  numeroOperacionDuplicada(indice: number): boolean {
    const pagos = this.formulario.controls.comprobantesPago.controls;
    const valor = pagos[indice]?.controls.numeroOperacion.value.trim().toLocaleLowerCase('es-PE');
    return Boolean(valor && pagos.some((pago, otroIndice) => otroIndice !== indice
      && pago.controls.numeroOperacion.value.trim().toLocaleLowerCase('es-PE') === valor));
  }

  cancelar(): void {
    this.solicitudProvincias++;
    this.solicitudDistritos++;
    this.cargandoProvincias.set(false);
    this.cargandoDistritos.set(false);
    this.formulario.reset({
      datosSolicitud: { fechaRecepcion: this.fechaHoy, horaRecepcion: this.horaActual },
      general: { apellidoP: '', apellidoM: '', nombre1: '', nombre2: '', fechaNacimiento: '', codTipoDocumento: '1', numeroDocumento: '', numeroRUC: '', celular1: '', celular2: '', fijo: '', correo1: '', correo2: '', codDepartamento: '', codProvincia: '', codDistrito: '' },
      datosAcademicos: { codUniversidad: '', tituloObtenido: '', codObtencion: '', fechaObtencion: '', areaEspecializacion: '', datosRevalidacion: '', datosMaestria: '', datosDoctorado: '', datosIdioma: '', datosOtrosEstudios: '' },
      actividadProfesional: { codEjerce: 'true', institucionTrabajo: '', institucionTrabajo2: '', actividadParticular: '', actividadParticular2: '' },
      necesidadCapacitacion: { otros: '', listTemas: '', listBienestar: '', otrosBienestar: '' },
      comprobantesPago: this.comprobantes.map(() => ({ numeroOperacion: '', fechaVoucher: '' }))
    });
    this.actualizarValidacionDocumento();
    this.mensaje.set('Formulario limpiado.');
    this.otrasActividades.reset();
    this.bienestar.reset();
    this.archivos.set({});
    this.archivosSeleccionados.set({});
    this.payloadPreparado.set(null);
    this.paso.set(0);
    this.pasoMaximo.set(0);
    this.hijosVisibles.set(0);
    this.provincias.set([]);
    this.distritos.set([]);
    this.formulario.controls.general.controls.codProvincia.disable();
    this.formulario.controls.general.controls.codDistrito.disable();
    this.errorUbicaciones.set('');
    Object.values(this.previsualizaciones()).forEach(url => URL.revokeObjectURL(url));
    this.previsualizaciones.set({});
    this.textoUniversidad.set('');
    this.listaUniversidadesAbierta.set(false);
    this.errorUniversidades.set('');
    this.seccionesAcademicas.set({ revalidacion: false, maestria: false, doctorado: false, idioma: false, otrosEstudios: false });
  }
}
