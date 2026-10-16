import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Ubicacion, UbicacionService, Universidad } from '../../../core/services/ubicacion.service';

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
  readonly mensaje = signal('');
  readonly departamentos = signal<Ubicacion[]>([]);
  readonly provincias = signal<Ubicacion[]>([]);
  readonly distritos = signal<Ubicacion[]>([]);
  readonly cargandoDepartamentos = signal(false);
  readonly cargandoProvincias = signal(false);
  readonly cargandoDistritos = signal(false);
  readonly errorUbicaciones = signal('');
  readonly universidades = signal<Universidad[]>([]);
  readonly buscandoUniversidad = signal(false);
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
  readonly previsualizaciones = signal<Record<string, string>>({});
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
      codEjerce: ['true'], institucionTrabajo: [''], institucionTrabajo2: [''], actividadParticular: [''], actividadParticular2: ['']
    }),
    necesidadCapacitacion: this.fb.nonNullable.group({
      otros: [''], listTemas: [''], listBienestar: [''], otrosBienestar: ['']
    })
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
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
    const consulta = normalizar(this.textoUniversidad().trim());
    const resultados = consulta
      ? this.universidades().filter(item => normalizar(item.nombre).includes(consulta))
      : this.universidades();
    return resultados.slice(0, 50);
  }

  buscarUniversidad(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.textoUniversidad.set(texto);
    this.listaUniversidadesAbierta.set(true);
    this.formulario.controls.datosAcademicos.controls.codUniversidad.setValue('');
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
    general.controls.codProvincia.setValue('');
    general.controls.codDistrito.setValue('');
    general.controls.codProvincia.disable();
    general.controls.codDistrito.disable();
    this.provincias.set([]);
    this.distritos.set([]);
    this.errorUbicaciones.set('');
    if (!codigoDepartamento) return;

    this.cargandoProvincias.set(true);
    this.ubicacionService.listarProvincias(codigoDepartamento).subscribe({
      next: provincias => {
        this.provincias.set(provincias);
        this.cargandoProvincias.set(false);
        if (provincias.length) general.controls.codProvincia.enable();
      },
      error: () => {
        this.cargandoProvincias.set(false);
        this.errorUbicaciones.set('No se pudieron cargar las provincias del departamento seleccionado.');
      }
    });
  }

  cargarDistritos(): void {
    const general = this.formulario.controls.general;
    const codigoProvincia = Number(general.controls.codProvincia.value);
    general.controls.codDistrito.setValue('');
    general.controls.codDistrito.disable();
    this.distritos.set([]);
    this.errorUbicaciones.set('');
    if (!codigoProvincia) return;

    this.cargandoDistritos.set(true);
    this.ubicacionService.listarDistritos(codigoProvincia).subscribe({
      next: distritos => {
        this.distritos.set(distritos);
        this.cargandoDistritos.set(false);
        if (distritos.length) general.controls.codDistrito.enable();
      },
      error: () => {
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
    this.mensaje.set('Formulario completado. El envío se habilitará cuando conectemos el servicio de registro.');
  }

  cancelar(): void {
    this.formulario.reset({
      datosSolicitud: { fechaRecepcion: this.fechaHoy, horaRecepcion: this.horaActual },
      general: { apellidoP: '', apellidoM: '', nombre1: '', nombre2: '', fechaNacimiento: '', codTipoDocumento: '1', numeroDocumento: '', numeroRUC: '', celular1: '', celular2: '', fijo: '', correo1: '', correo2: '', codDepartamento: '', codProvincia: '', codDistrito: '' },
      datosAcademicos: { codUniversidad: '', tituloObtenido: '', codObtencion: '', fechaObtencion: '', areaEspecializacion: '', datosRevalidacion: '', datosMaestria: '', datosDoctorado: '', datosIdioma: '', datosOtrosEstudios: '' },
      actividadProfesional: { codEjerce: 'true', institucionTrabajo: '', institucionTrabajo2: '', actividadParticular: '', actividadParticular2: '' },
      necesidadCapacitacion: { otros: '', listTemas: '', listBienestar: '', otrosBienestar: '' }
    });
    this.actualizarValidacionDocumento();
    this.mensaje.set('Formulario limpiado.');
    this.otrasActividades.reset();
    this.bienestar.reset();
    this.archivos.set({});
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
