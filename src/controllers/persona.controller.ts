import { Request, Response } from "express";
import { CorreoDuplicadoError, DatosNuevaPersona, PersonaService } from "../services/persona.service";

type ParametrosId = { id: string };

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Días máximos por mes (febrero con 29 para admitir nacidos en año bisiesto).
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  listarPersonas = async (_req: Request, res: Response): Promise<void> => {
    try {
      const personas = await this.personaService.listarPersonasActivas();
      res.status(200).json(personas);
    } catch (error) {
      this.responderErrorInterno(res, error);
    }
  };

  obtenerCumpleanerosDeHoy = async (_req: Request, res: Response): Promise<void> => {
    try {
      const cumpleaneros = await this.personaService.obtenerCumpleanerosDeHoy();
      res.status(200).json(cumpleaneros);
    } catch (error) {
      this.responderErrorInterno(res, error);
    }
  };

  obtenerEnviosDeHoy = async (_req: Request, res: Response): Promise<void> => {
    try {
      const envios = await this.personaService.obtenerEnviosDeHoy();
      res.status(200).json(envios);
    } catch (error) {
      this.responderErrorInterno(res, error);
    }
  };

  crearPersona = async (req: Request, res: Response): Promise<void> => {
    const resultado = this.validarNuevaPersona(req.body);

    if (typeof resultado === "string") {
      res.status(400).json({ mensaje: resultado });
      return;
    }

    try {
      const persona = await this.personaService.crearPersona(resultado);
      res.status(201).json(persona);
    } catch (error) {
      if (error instanceof CorreoDuplicadoError) {
        res.status(409).json({ mensaje: error.message });
        return;
      }
      this.responderErrorInterno(res, error);
    }
  };

  eliminarPersona = async (req: Request<ParametrosId>, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ mensaje: "El parámetro id debe ser un entero positivo" });
      return;
    }

    try {
      const fueDesactivada = await this.personaService.desactivarPersona(id);

      if (!fueDesactivada) {
        res.status(404).json({ mensaje: `No existe una persona activa con id ${id}` });
        return;
      }

      res.status(200).json({ mensaje: `Persona ${id} desactivada correctamente`, id, activo: false });
    } catch (error) {
      this.responderErrorInterno(res, error);
    }
  };

  /** Devuelve los datos validados o un mensaje de error. */
  private validarNuevaPersona(body: unknown): DatosNuevaPersona | string {
    const { nombre, correo, dia, mes } = (body ?? {}) as Record<string, unknown>;

    if (typeof nombre !== "string" || nombre.trim() === "" || nombre.trim().length > 100) {
      return "El campo nombre es obligatorio (máximo 100 caracteres)";
    }
    if (typeof correo !== "string" || correo.trim().length > 150 || !REGEX_CORREO.test(correo.trim())) {
      return "El campo correo es obligatorio y debe ser un correo electrónico válido";
    }
    if (typeof mes !== "number" || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return "El campo mes debe ser un entero entre 1 y 12";
    }
    if (typeof dia !== "number" || !Number.isInteger(dia) || dia < 1 || dia > DIAS_POR_MES[mes - 1]) {
      return `El campo dia debe ser un entero entre 1 y ${DIAS_POR_MES[mes - 1]} para el mes ${mes}`;
    }

    return { nombre, correo, dia, mes };
  }

  private responderErrorInterno(res: Response, error: unknown): void {
    console.error("[PersonaController]", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
