const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { query } = require("./bd");

const scrypt = promisify(crypto.scrypt);
const NOMBRE_COOKIE = "agrosense_session";
const DURACION_MS = 8 * 60 * 60 * 1000;
const SESIONES = new Map();
const OPCIONES_SCRYPT = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

async function hashPassword(contraseña) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(contraseña, salt, 64, OPCIONES_SCRYPT);

  return (
    "scrypt$" +
    salt.toString("base64url") +
    "$" +
    hash.toString("base64url")
  );
}

async function verificarPassword(contraseña, almacenada) {
  if (typeof contraseña !== "string" || typeof almacenada !== "string") {
    return false;
  }

  const [algoritmo, saltTexto, hashTexto] = almacenada.split("$");

  if (algoritmo !== "scrypt" || !saltTexto || !hashTexto) {
    return false;
  }

  let salt;
  let hashEsperado;

  try {
    salt = Buffer.from(saltTexto, "base64url");
    hashEsperado = Buffer.from(hashTexto, "base64url");
  } catch {
    return false;
  }

  if (salt.length !== 16 || hashEsperado.length !== 64) {
    return false;
  }

  const calculado = await scrypt(
    contraseña,
    salt,
    64,
    OPCIONES_SCRYPT
  );

  return crypto.timingSafeEqual(calculado, hashEsperado);
}

async function iniciarSesion(nombre, contraseña) {
  if (typeof nombre !== "string" || typeof contraseña !== "string") {
    return null;
  }

  const nombreLimpio = nombre.trim();

  if (
    !nombreLimpio ||
    nombreLimpio.length > 100 ||
    contraseña.length > 200
  ) {
    return null;
  }

  const resultado = await query(
    `SELECT id, nombre, contra, puesto
     FROM public.usuarios
     WHERE lower(nombre) = lower($1)
     LIMIT 1`,
    [nombreLimpio]
  );

  const fila = resultado.rows[0];

  if (!fila || !(await verificarPassword(contraseña, fila.contra))) {
    return null;
  }

  return {
    id: String(fila.id),
    nombre: fila.nombre,
    puesto: fila.puesto
  };
}

function leerCookie(req) {
  const cookies = (req.headers.cookie || "").split(";");

  const encontrada = cookies
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(NOMBRE_COOKIE + "="));

  return encontrada
    ? encontrada.slice(NOMBRE_COOKIE.length + 1)
    : "";
}

function obtenerSesion(req) {
  const token = leerCookie(req);
  const sesion = SESIONES.get(token);

  if (!sesion) return null;

  if (sesion.expira <= Date.now()) {
    SESIONES.delete(token);
    return null;
  }

  return sesion.usuario;
}

function nuevaSesion(usuario) {
  const token = crypto.randomBytes(32).toString("hex");

  SESIONES.set(token, {
    usuario,
    expira: Date.now() + DURACION_MS
  });

  return token;
}

function crearCookie(req, token, segundos) {
  const proto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();

  const segura =
    proto === "https" ||
    Boolean(req.socket && req.socket.encrypted);

  return (
    NOMBRE_COOKIE +
    "=" +
    token +
    "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" +
    segundos +
    (segura ? "; Secure" : "")
  );
}

function cerrarSesion(req) {
  const token = leerCookie(req);

  if (token) SESIONES.delete(token);

  return crearCookie(req, "", 0);
}

module.exports = {
  hashPassword,
  iniciarSesion,
  obtenerSesion,
  nuevaSesion,
  crearCookie,
  cerrarSesion,
  DURACION_SEGUNDOS: Math.floor(DURACION_MS / 1000)
};