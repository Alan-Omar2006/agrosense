const http = require("node:http");
const { comprobarConexion, consultarProyecto, cerrar, describirError } = require("./bd");

const rutas = new Map([
  ["/api/salud", comprobarConexion],
  ["/api/proyecto", consultarProyecto]
]);

function responder(res, estado, datos) {
  res.writeHead(estado, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(datos));
}

const servidor = http.createServer(async (req, res) => {
  const ruta = req.url.split("?")[0];
  const operacion = rutas.get(ruta);
  if (!operacion) return responder(res, 404, { error: "Ruta no encontrada." });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return responder(res, 405, { error: "Método no permitido." });
  }
  try {
    responder(res, 200, await operacion());
  } catch (error) {
    console.error(describirError(error));
    responder(res, 503, { ok: false, error: "No hay conexión disponible con la base de datos." });
  }
});

servidor.listen(Number(process.env.PORT || 3000), () => {
  console.log("API de AgroSense en el puerto " + servidor.address().port);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    servidor.close(async () => {
      await cerrar();
    });
  });
}
