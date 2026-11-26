const fs = require("node:fs");
const { Pool } = require("pg");

let pool;

function obtenerPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta el secreto DATABASE_URL.", { cause: "CONFIGURACION" });
  }

  let url;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL no es una URI válida.", { cause: "CONFIGURACION" });
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || !url.password) {
    throw new Error("DATABASE_URL debe identificar un usuario y servidor PostgreSQL.", { cause: "CONFIGURACION" });
  }

  // Las opciones de TLS se configuran aquí para que la URI no las reemplace.
  url.search = "";
  const ssl = { rejectUnauthorized: true };
  if (process.env.DATABASE_CA_FILE) {
    try {
      ssl.ca = fs.readFileSync(process.env.DATABASE_CA_FILE, "utf8");
    } catch {
      throw new Error("No se pudo leer el certificado DATABASE_CA_FILE.", { cause: "CONFIGURACION" });
    }
  }

  pool = new Pool({
    connectionString: url.href,
    ssl,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
    idleTimeoutMillis: 10000
  });

  pool.on("error", error => console.error(describirError(error)));
  return pool;
}

function describirError(error) {
  if (error.cause === "CONFIGURACION") return error.message;
  const mensajes = {
    "28P01": "PostgreSQL rechazó las credenciales. Revisa el usuario y la contraseña de la aplicación.",
    "28000": "PostgreSQL no autorizó la conexión. Revisa el usuario y la referencia del proyecto.",
    "42501": "El usuario no tiene acceso a las tablas. Revisa el SQL de permisos.",
    "42P01": "No se encontró una tabla de AgroSense. Revisa el proyecto y la carga inicial.",
    "ENOTFOUND": "No se encontró el servidor. Revisa el host copiado de Session pooler.",
    "ECONNREFUSED": "No se pudo abrir la conexión. Revisa el host, el puerto y el estado del proyecto.",
    "SELF_SIGNED_CERT_IN_CHAIN": "El certificado requiere la CA de Supabase. Revisa DATABASE_CA_FILE.",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE": "No se pudo verificar TLS. Revisa DATABASE_CA_FILE.",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY": "No se pudo verificar TLS. Revisa DATABASE_CA_FILE."
  };
  return mensajes[error.code] || "No se pudo completar la consulta. Revisa la conexión y el estado de Supabase.";
}

async function comprobarConexion() {
  const inicio = performance.now();
  await obtenerPool().query("SELECT 1");
  return { ok: true, baseDatos: "PostgreSQL en Supabase", latenciaMs: Math.round(performance.now() - inicio) };
}

async function consultarProyecto() {
  const resultado = await obtenerPool().query(
    "SELECT (SELECT count(*) FROM agrosense.sensores) AS sensores, " +
    "(SELECT count(*) FROM agrosense.lecturas) AS lecturas"
  );
  return {
    proyecto: "AgroSense",
    sensores: Number(resultado.rows[0].sensores),
    lecturas: Number(resultado.rows[0].lecturas)
  };
}

async function cerrar() {
  if (pool) await pool.end();
}

module.exports = { comprobarConexion, consultarProyecto, cerrar, describirError };
