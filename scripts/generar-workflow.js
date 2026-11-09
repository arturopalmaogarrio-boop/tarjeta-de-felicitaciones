/**
 * Genera n8n/workflow-cumpleanos.json a partir de las plantillas HTML:
 *   - n8n/tarjeta-cumpleanos.html       → correo para quien cumple años
 *   - n8n/notificacion-cumpleanos.html  → aviso para las demás personas
 *
 * Uso:  npm run workflow   (y luego reimportar el JSON en n8n)
 *
 * Marcadores en las plantillas: {{ nombre }}, {{ cumpleanerosTexto }}.
 * La imagen se referencia como src='cid:pusheen-pastel' y viaja adjunta (inline) en el correo,
 * así que se ve siempre, sin depender de internet.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const leerPlantilla = (archivo) =>
  fs
    .readFileSync(path.join(RAIZ, "n8n", archivo), "utf8")
    .replace(/<!--[\s\S]*?-->\r?\n?/g, "")
    .replace(/\r?\n/g, "");

const CREDENCIAL_GMAIL = { gmailOAuth2: { id: "XWEOyKm1JW1wrvFa", name: "Gmail account" } };

const codigoArmarCorreos = `// Generado por scripts/generar-workflow.js — no editar aquí, editar las plantillas HTML.
const PLANTILLA_TARJETA = ${JSON.stringify(leerPlantilla("tarjeta-cumpleanos.html"))};
const PLANTILLA_NOTIFICACION = ${JSON.stringify(leerPlantilla("notificacion-cumpleanos.html"))};
const CID_GIF = 'pusheen-pastel';

const gif = $('Obtener GIF Pusheen').first().json;

const escaparHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const rellenar = (plantilla, datos) =>
  plantilla.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (_, clave) => escaparHtml(datos[clave]));
const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');
const partirLineas = (b64) => b64.replace(/.{1,76}/g, '$&\\r\\n');
const encabezadoUtf8 = (texto) => '=?UTF-8?B?' + base64(texto) + '?=';
const sinSaltos = (texto) => String(texto ?? '').replace(/[\\r\\n]/g, ' ');

const salida = [];
for (const item of $input.all()) {
  const envio = item.json;
  if (!envio.correo || !envio.tipo) continue; // respuesta vacía: no hay cumpleaños hoy

  const esTarjeta = envio.tipo === 'tarjeta';
  const html = rellenar(esTarjeta ? PLANTILLA_TARJETA : PLANTILLA_NOTIFICACION, envio);
  const asunto = esTarjeta
    ? '🎉 ¡FELICIDADES, ' + sinSaltos(envio.nombre) + '! De parte de tu equipo DGTSI'
    : '🎈 Hoy celebramos el cumpleaños de ' + sinSaltos(envio.cumpleanerosTexto);
  const limite = 'dgtsi_' + Math.random().toString(36).slice(2);

  const mime = [
    'To: ' + sinSaltos(envio.correo),
    'Subject: ' + encabezadoUtf8(asunto),
    'MIME-Version: 1.0',
    'Content-Type: multipart/related; boundary="' + limite + '"',
    '',
    '--' + limite,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    partirLineas(base64(html)),
    '--' + limite,
    'Content-Type: ' + gif.mimeType + '; name="' + gif.nombreArchivo + '"',
    'Content-Transfer-Encoding: base64',
    'Content-ID: <' + CID_GIF + '>',
    'X-Attachment-Id: ' + CID_GIF,
    'Content-Disposition: inline; filename="' + gif.nombreArchivo + '"',
    '',
    partirLineas(gif.base64),
    '--' + limite + '--',
    '',
  ].join('\\r\\n');

  salida.push({
    json: {
      tipo: envio.tipo,
      correo: envio.correo,
      raw: Buffer.from(mime, 'utf8').toString('base64url'),
    },
  });
}

return salida;
`;

const workflow = {
  id: "cumpleanosWf0001",
  name: "Felicitaciones de Cumpleaños - Gmail OAuth2",
  nodes: [
    {
      parameters: { rule: { interval: [{ triggerAtHour: 8 }] } },
      id: "a1b2c3d4-0001-4000-8000-000000000001",
      name: "Cron 08:00 AM",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [0, 0],
    },
    {
      parameters: { url: "http://backend:3000/api/recursos/pusheen-gif", options: {} },
      id: "a1b2c3d4-0007-4000-8000-000000000007",
      name: "Obtener GIF Pusheen",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [220, 0],
    },
    {
      parameters: { url: "http://backend:3000/api/personas/envios-hoy", options: {} },
      id: "a1b2c3d4-0002-4000-8000-000000000002",
      name: "Consultar Envíos de Hoy",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [440, 0],
    },
    {
      parameters: { jsCode: codigoArmarCorreos },
      id: "a1b2c3d4-0008-4000-8000-000000000008",
      name: "Armar Correos (tarjeta y avisos)",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [660, 0],
    },
    {
      parameters: {
        method: "POST",
        url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "gmailOAuth2",
        sendBody: true,
        bodyParameters: { parameters: [{ name: "raw", value: "={{ $json.raw }}" }] },
        options: {},
      },
      id: "a1b2c3d4-0009-4000-8000-000000000009",
      name: "Enviar Correo (Gmail API)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [880, 0],
      credentials: CREDENCIAL_GMAIL,
    },
  ],
  connections: {
    "Cron 08:00 AM": { main: [[{ node: "Obtener GIF Pusheen", type: "main", index: 0 }]] },
    "Obtener GIF Pusheen": { main: [[{ node: "Consultar Envíos de Hoy", type: "main", index: 0 }]] },
    "Consultar Envíos de Hoy": {
      main: [[{ node: "Armar Correos (tarjeta y avisos)", type: "main", index: 0 }]],
    },
    "Armar Correos (tarjeta y avisos)": {
      main: [[{ node: "Enviar Correo (Gmail API)", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  active: false,
};

const destino = path.join(RAIZ, "n8n", "workflow-cumpleanos.json");
fs.writeFileSync(destino, JSON.stringify(workflow, null, 2) + "\n");
console.log(`Workflow generado en ${path.relative(RAIZ, destino)}`);
