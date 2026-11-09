import { DataSource, IsNull, Not, Repository } from "typeorm";
import { Persona } from "../models/persona.model";

export class PersonaRepository {
  private readonly repository: Repository<Persona>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Persona);
  }

  crear(datos: Pick<Persona, "nombre" | "correo" | "dia" | "mes">): Promise<Persona> {
    const persona = this.repository.create({ ...datos, activo: true });
    return this.repository.save(persona);
  }

  /** Solo personas activas; las desactivadas (borrado lógico) siguen en la BD pero no se listan. */
  findActivos(): Promise<Persona[]> {
    return this.repository.find({
      where: { activo: true },
      order: { nombre: "ASC" },
    });
  }

  findByCumpleanos(dia: number, mes: number): Promise<Persona[]> {
    return this.repository.find({
      where: { dia, mes, activo: true },
      order: { nombre: "ASC" },
    });
  }

  /** Personas activas que tienen correo registrado (posibles destinatarios). */
  findActivosConCorreo(): Promise<Persona[]> {
    return this.repository.find({
      where: { activo: true, correo: Not(IsNull()) },
      order: { nombre: "ASC" },
    });
  }

  /**
   * Borrado lógico: ejecuta UPDATE personas SET activo = false (nunca DELETE físico).
   * Devuelve false si el id no existe o ya estaba inactivo.
   */
  async softDelete(id: number): Promise<boolean> {
    const resultado = await this.repository.update({ id, activo: true }, { activo: false });
    return (resultado.affected ?? 0) > 0;
  }
}
