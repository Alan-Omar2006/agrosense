const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

let pool;

function describirError(error) {
  const mensajes = {
    "28P01": "PostgreSQL rechazó las credenciales de la aplicación.",
    "42501": "El rol agrosense_app no tiene permisos para esta operación.",
    "23503": "La referencia seleccionada no existe o tiene registros relacionados.",
    "23505": "Ya existe un registro con esos datos.",
    "22P02": "Uno de los valores no tiene el formato esperado.",
    "22003": "Uno de los valores está fuera del rango permitido.",
    "ENOTFOUND": "No se encontró el servidor indicado en DATABASE_URL.",
    "ECONNREFUSED": "No se pudo abrir una conexión con PostgreSQL."
  };
  return mensajes[error.code] || "No se pudo completar la operación con PostgreSQL.";
}

function obtenerPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta el secreto DATABASE_URL.");
  }

  const url = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL debe ser una URI de PostgreSQL.");
  }

  // TLS permanece activo y verifica el certificado del servidor.
  url.search = "";
  const caPath = process.env.DATABASE_CA_FILE || path.join(__dirname, "supabase-ca.crt");
  if (!fs.existsSync(caPath)) {
    throw new Error("No se encontró el certificado de Supabase: " + caPath);
  }
  const ssl = { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") };

  pool = new Pool({
    connectionString: url.href,
    ssl,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 6000,
    idleTimeoutMillis: 10000,
    application_name: "agrosense-unidad-iii"
  });

  pool.on("error", error => console.error("[PostgreSQL]", error.code || "", error.message || describirError(error)));
  return pool;
}

async function query(sql, valores = []) {
  return obtenerPool().query(sql, valores);
}

async function cerrar() {
  if (pool) await pool.end();
}

module.exports = { query, cerrar, describirError };
