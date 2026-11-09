import { Router } from "express";
import { PersonaController } from "../controllers/persona.controller";

export function crearPersonaRouter(personaController: PersonaController): Router {
  const router = Router();

  router.get("/", personaController.listarPersonas);
  router.post("/", personaController.crearPersona);
  router.get("/hoy", personaController.obtenerCumpleanerosDeHoy);
  router.get("/envios-hoy", personaController.obtenerEnviosDeHoy);
  router.delete("/:id", personaController.eliminarPersona);

  return router;
}
