import "reflect-metadata";
import { DataSource } from "typeorm";
import { Persona } from "../models/persona.model";

function leerVariableObligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === "") {
    throw new Error(`Variable de entorno obligatoria no definida: ${nombre}`);
  }
  return valor;
}

function leerPuerto(nombre: string): number {
  const puerto = Number.parseInt(leerVariableObligatoria(nombre), 10);
  if (Number.isNaN(puerto)) {
    throw new Error(`La variable ${nombre} debe ser un número de puerto válido`);
  }
  return puerto;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: leerVariableObligatoria("POSTGRES_HOST"),
  port: leerPuerto("POSTGRES_PORT"),
  username: leerVariableObligatoria("POSTGRES_USER"),
  password: leerVariableObligatoria("POSTGRES_PASSWORD"),
  database: leerVariableObligatoria("POSTGRES_DB"),
  entities: [Persona],
  synchronize: process.env.DB_SYNCHRONIZE === "true",
  logging: process.env.DB_LOGGING === "true",
});
