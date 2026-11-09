import "reflect-metadata";
import path from "path";
import { readFile } from "fs/promises";
import express, { NextFunction, Request, Response } from "express";
import { AppDataSource } from "./config/database";
import { PersonaRepository } from "./repositories/persona.repository";
import { PersonaService } from "./services/persona.service";
import { PersonaController } from "./controllers/persona.controller";
import { crearPersonaRouter } from "./routes/persona.routes";

const PUERTO_INTERNO = 3000;
const RUTA_GIF_PUSHEEN = path.join(__dirname, "..", "public", "img", "pusheen-pastel.gif");

async function iniciarServidor(): Promise<void> {
  await AppDataSource.initialize();
  console.log("[DB] Conexión con PostgreSQL establecida");

  const personaRepository = new PersonaRepository(AppDataSource);
  const personaService = new PersonaService(personaRepository);
  const personaController = new PersonaController(personaService);

  const app = express();
  app.use(express.json());

  // CORS: permite usar los formularios aunque se abran fuera del backend (file://, Live Server…).
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  // Formulario de registro (public/index.html) en http://localhost:3000/
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use("/api/personas", crearPersonaRouter(personaController));

  // GIF de Pusheen en base64 para que n8n lo incruste (CID) en los correos sin depender de internet.
  app.get("/api/recursos/pusheen-gif", async (_req: Request, res: Response) => {
    try {
      const contenido = await readFile(RUTA_GIF_PUSHEEN);
      res.status(200).json({
        nombreArchivo: "pusheen-pastel.gif",
        mimeType: "image/gif",
        base64: contenido.toString("base64"),
      });
    } catch (error) {
      console.error("[Recursos] No se pudo leer el GIF de Pusheen:", error);
      res.status(500).json({ mensaje: "No se pudo leer el GIF de Pusheen" });
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ mensaje: "Recurso no encontrado" });
  });

  app.listen(PUERTO_INTERNO, () => {
    console.log(`[HTTP] Backend escuchando en el puerto ${PUERTO_INTERNO}`);
  });
}

iniciarServidor().catch((error: unknown) => {
  console.error("[BOOT] Error al iniciar la aplicación:", error);
  process.exit(1);
});
