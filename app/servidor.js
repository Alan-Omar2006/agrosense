const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const api = require("./api");
const auth = require("./auth");
const { cerrar, describirError } = require("./bd");

const puerto = Number(process.env.PORT || 3000);
const web = path.join(__dirname, "web");

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function responder(res, status, datos, cabeceras = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...cabeceras
  });

  res.end(JSON.stringify(datos));
}

function redirigir(res, destino) {
  res.writeHead(303, {
    Location: destino,
    "Cache-Control": "no-store"
  });
  res.end();
}

function enviarArchivo(ruta, res) {
  const pagina =
    ruta === "/"
      ? "index.html"
      : decodeURIComponent(ruta.slice(1));

  const destino = path.resolve(web, pagina);

  if (
    !destino.startsWith(web + path.sep) &&
    destino !== path.join(web, "index.html")
  ) {
    return responder(res, 403, { error: "Ruta no permitida." });
  }

  fs.readFile(destino, (error, contenido) => {
    if (error) {
      return responder(res, 404, {
        error: "No se encontró la página solicitada."
      });
    }

    res.writeHead(200, {
      "Content-Type":
        tipos[path.extname(destino)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    });

    res.end(contenido);
  });
}

async function leerJson(req) {
  let cuerpo = "";

  for await (const parte of req) {
    cuerpo += parte;

    if (cuerpo.length > 65536) {
      throw new api.ErrorApi(
        413,
        "El cuerpo supera el límite permitido."
      );
    }
  }

  try {
    return JSON.parse(cuerpo || "{}");
  } catch {
    throw new api.ErrorApi(400, "El cuerpo no contiene JSON válido.");
  }
}

function idDesde(ruta, recurso) {
  const coincidencia = ruta.match(
    new RegExp("^/api/" + recurso + "/([0-9]+)$")
  );

  return coincidencia ? Number(coincidencia[1]) : null;
}

async function rutaApi(req, ruta, qs) {
  const metodo = req.method;
  const sensorId = idDesde(ruta, "sensores");
  const lecturaId = idDesde(ruta, "lecturas");

  if (metodo === "GET" && ruta === "/api/salud") {
    return api.salud();
  }

  if (metodo === "GET" && ruta === "/api/proyecto") {
    return api.proyecto();
  }

  if (metodo === "GET" && ruta === "/api/cultivos") {
    return api.cultivos();
  }

  if (metodo === "GET" && ruta === "/api/sensores") {
    return api.listarSensores(qs);
  }

  if (metodo === "POST" && ruta === "/api/sensores") {
    return [201, await api.crearSensor(await leerJson(req))];
  }

  if (sensorId && metodo === "GET") {
    return api.verSensor(sensorId);
  }

  if (sensorId && metodo === "PATCH") {
    return api.modificarSensor(sensorId, await leerJson(req));
  }

  if (sensorId && metodo === "DELETE") {
    return api.eliminarSensor(sensorId);
  }

  if (metodo === "GET" && ruta === "/api/lecturas") {
    return api.listarLecturas(qs);
  }

  if (metodo === "POST" && ruta === "/api/lecturas") {
    return [201, await api.crearLectura(await leerJson(req))];
  }

  if (lecturaId && metodo === "GET") {
    return api.verLectura(lecturaId);
  }

  if (lecturaId && metodo === "PATCH") {
    return api.modificarLectura(lecturaId, await leerJson(req));
  }

  if (lecturaId && metodo === "DELETE") {
    return api.eliminarLectura(lecturaId);
  }

  if (metodo === "GET" && ruta === "/api/reportes/ambiente") {
    return api.reporteAmbiente(qs);
  }

  throw new api.ErrorApi(
    404,
    "No existe la ruta " + metodo + " " + ruta + "."
  );
}

const servidor = http.createServer(async (req, res) => {
  let ruta;

  try {
    const url = new URL(req.url, "http://localhost");
    ruta = url.pathname;

    if (
      ["GET", "HEAD"].includes(req.method) &&
      ["/", "/index.html", "/dashboard"].includes(ruta)
    ) {
      return enviarArchivo(
        auth.obtenerSesion(req) ? "/index.html" : "/login.html",
        res
      );
    }

    if (
      ["GET", "HEAD"].includes(req.method) &&
      ["/login", "/login.html"].includes(ruta)
    ) {
      return auth.obtenerSesion(req)
        ? redirigir(res, "/")
        : enviarArchivo("/login.html", res);
    }

    if (!ruta.startsWith("/api/")) {
      return enviarArchivo(ruta, res);
    }

    if (req.method === "GET" && ruta === "/api/auth/me") {
      const sesion = auth.obtenerSesion(req);

      return responder(
        res,
        200,
        sesion
          ? { autenticado: true, usuario: sesion }
          : { autenticado: false }
      );
    }

    if (req.method === "POST" && ruta === "/api/auth/login") {
      const datos = await leerJson(req);
      const usuario = await auth.iniciarSesion(
        datos.nombre,
        datos.contra
      );

      if (!usuario) {
        throw new api.ErrorApi(
          401,
          "Nombre o contraseña incorrectos."
        );
      }

      const token = auth.nuevaSesion(usuario);

      return responder(
        res,
        200,
        { autenticado: true, usuario },
        {
          "Set-Cookie": auth.crearCookie(
            req,
            token,
            auth.DURACION_SEGUNDOS
          )
        }
      );
    }

    if (req.method === "POST" && ruta === "/api/auth/logout") {
      const cookie = auth.cerrarSesion(req);

      if (String(req.headers.accept || "").includes("text/html")) {
        res.writeHead(303, {
          Location: "/login",
          "Cache-Control": "no-store",
          "Set-Cookie": cookie
        });
        return res.end();
      }

      return responder(
        res,
        200,
        { ok: true },
        { "Set-Cookie": cookie }
      );
    }

    if (!auth.obtenerSesion(req)) {
      return responder(res, 401, {
        error: "Inicia sesión para continuar."
      });
    }

    const respuesta = await rutaApi(req, ruta, url.searchParams);

    if (
      Array.isArray(respuesta) &&
      typeof respuesta[0] === "number"
    ) {
      return responder(res, respuesta[0], respuesta[1]);
    }

    return responder(res, 200, respuesta);
  } catch (error) {
    if (error instanceof api.ErrorApi) {
      return responder(res, error.status, { error: error.message });
    }

    console.error(
      "[API]",
      error.code || "",
      error.message || describirError(error)
    );

    const codigo =
      ["23505"].includes(error.code)
        ? 409
        : ["23503", "22P02", "22003"].includes(error.code)
          ? 400
          : error.code === "42501"
            ? 503
            : 500;

    return responder(res, codigo, {
      error:
        codigo === 500
          ? process.env.NODE_ENV === "production"
            ? "Error interno al procesar la solicitud."
            : error.message
          : describirError(error)
    });
  }
});

servidor.listen(puerto, () => {
  console.log(
    "AgroSense disponible en el puerto " +
      servidor.address().port
  );
});

for (const señal of ["SIGINT", "SIGTERM"]) {
  process.once(señal, () =>
    servidor.close(() => cerrar().finally(() => process.exit(0)))
  );
}