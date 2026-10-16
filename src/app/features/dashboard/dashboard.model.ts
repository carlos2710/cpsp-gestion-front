/** Contrato de presentación del resumen; preparado para el endpoint agregado del dashboard. */
export interface DashboardResumen {
  contexto: { codPerfil: number; codEmpresa: number; codLocal: number };
  indicadores: DashboardIndicador[];
  solicitudesPorEstado: SerieDashboard[];
  solicitudesRecientes: SolicitudReciente[];
  actualizadoEn: string | null;
}

export interface DashboardIndicador {
  clave: string;
  titulo: string;
  valor: number | null;
  variacionPorcentual?: number | null;
}

export interface SerieDashboard { etiqueta: string; cantidad: number; }

export interface SolicitudReciente {
  id: number;
  nombre: string;
  fecha: string;
  estado: string;
}
