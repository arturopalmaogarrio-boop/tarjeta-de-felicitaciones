import { Persona } from "../models/persona.model";
import { PersonaRepository } from "../repositories/persona.repository";

export interface FechaCalendario {
  dia: number;
  mes: number;
}

export interface DatosNuevaPersona {
  nombre: string;
  correo: string;
  dia: number;
  mes: number;
}

/**
 * Un correo listo para que n8n lo envíe:
 * - "tarjeta": felicitación para quien cumple años hoy.
 * - "notificacion": aviso a los demás de quién cumple años hoy.
 */
export interface EnvioCorreo {
  tipo: "tarjeta" | "notificacion";
  nombre: string;
  correo: string;
  cumpleaneros: string[];
  cumpleanerosTexto: string;
}

export class CorreoDuplicadoError extends Error {
  constructor(correo: string) {
    super(`Ya existe una persona registrada con el correo ${correo}`);
    this.name = "CorreoDuplicadoError";
  }
}

const CODIGO_PG_VIOLACION_UNIQUE = "23505";

export class PersonaService {
  constructor(private readonly personaRepository: PersonaRepository) {}

  async crearPersona(datos: DatosNuevaPersona): Promise<Persona> {
    const correo = datos.correo.trim().toLowerCase();

    try {
      return await this.personaRepository.crear({
        nombre: datos.nombre.trim(),
        correo,
        dia: datos.dia,
        mes: datos.mes,
      });
    } catch (error) {
      const codigo = (error as { driverError?: { code?: string } }).driverError?.code;
      if (codigo === CODIGO_PG_VIOLACION_UNIQUE) {
        throw new CorreoDuplicadoError(correo);
      }
      throw error;
    }
  }

  listarPersonasActivas(): Promise<Persona[]> {
    return this.personaRepository.findActivos();
  }

  obtenerCumpleanerosDeHoy(): Promise<Persona[]> {
    const { dia, mes } = this.calcularFechaActual();
    return this.personaRepository.findByCumpleanos(dia, mes);
  }

  /**
   * Arma los correos del día: una tarjeta para cada cumpleañero y una notificación
   * para cada persona restante con la lista de quienes cumplen años. Si dos personas
   * cumplen el mismo día, cada una recibe su tarjeta y además una notificación de la otra.
   */
  async obtenerEnviosDeHoy(): Promise<EnvioCorreo[]> {
    const { dia, mes } = this.calcularFechaActual();
    const personas = await this.personaRepository.findActivosConCorreo();
    const cumpleaneros = personas.filter((p) => p.dia === dia && p.mes === mes);

    if (cumpleaneros.length === 0) {
      return [];
    }

    const envios: EnvioCorreo[] = cumpleaneros.map((p) => ({
      tipo: "tarjeta",
      nombre: p.nombre,
      correo: p.correo as string,
      cumpleaneros: [p.nombre],
      cumpleanerosTexto: p.nombre,
    }));

    for (const persona of personas) {
      const otros = cumpleaneros.filter((c) => c.id !== persona.id).map((c) => c.nombre);
      if (otros.length > 0) {
        envios.push({
          tipo: "notificacion",
          nombre: persona.nombre,
          correo: persona.correo as string,
          cumpleaneros: otros,
          cumpleanerosTexto: this.unirNombres(otros),
        });
      }
    }

    return envios;
  }

  desactivarPersona(id: number): Promise<boolean> {
    return this.personaRepository.softDelete(id);
  }

  /** ["A"] → "A"; ["A","B"] → "A y B"; ["A","B","C"] → "A, B y C". */
  private unirNombres(nombres: string[]): string {
    if (nombres.length <= 1) return nombres.join("");
    return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  }

  private calcularFechaActual(fecha: Date = new Date()): FechaCalendario {
    return {
      dia: fecha.getDate(),
      mes: fecha.getMonth() + 1,
    };
  }
}
