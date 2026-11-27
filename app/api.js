const { query } = require("./bd");

class ErrorApi extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function entero(valor, nombre, defecto, minimo, maximo) {
  if (valor === undefined || valor === "") return defecto;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorApi(400, nombre + " debe ser un entero entre " + minimo + " y " + maximo + ".");
  }
  return numero;
}

function texto(valor, nombre, maximo, obligatorio = false) {
  if (typeof valor !== "string") {
    if (valor === undefined && !obligatorio) return undefined;
    throw new ErrorApi(400, nombre + " debe ser texto.");
  }
  const limpio = valor.trim();
  if ((obligatorio && !limpio) || limpio.length > maximo) {
    throw new ErrorApi(400, nombre + " es obligatorio y debe tener máximo " + maximo + " caracteres.");
  }
  return limpio;
}

function decimal(valor, nombre, minimo, maximo, opcional = false) {
  if (valor === undefined && opcional) return undefined;
  const numero = Number(valor);
  if (valor === null || valor === "" || !Number.isFinite(numero) || numero < minimo || numero > maximo) {
    throw new ErrorApi(400, nombre + " debe ser un número entre " + minimo + " y " + maximo + ".");
  }
  return numero;
}

function booleano(valor, nombre, opcional = false) {
  if (valor === undefined && opcional) return undefined;
  if (typeof valor !== "boolean") throw new ErrorApi(400, nombre + " debe ser verdadero o falso.");
  return valor;
}

function fecha(valor, nombre, opcional = false) {
  if (valor === undefined && opcional) return undefined;
  if (typeof valor !== "string" || Number.isNaN(Date.parse(valor))) {
    throw new ErrorApi(400, nombre + " debe ser una fecha y hora válida.");
  }
  return new Date(valor).toISOString();
}

function objeto(valor) {
  if (!valor || Array.isArray(valor) || typeof valor !== "object") {
    throw new ErrorApi(400, "El cuerpo debe ser un objeto JSON.");
  }
}

function paginaDesde(querystring) {
  const pagina = entero(querystring.get("pagina"), "pagina", 1, 1, 100000);
  const limite = entero(querystring.get("limite"), "limite", 10, 1, 100);
  return { pagina, limite, salto: (pagina - 1) * limite };
}

function campoCultivo(datos) {
  if (datos.cultivo_id === undefined) return undefined;
  if (datos.cultivo_id === null || datos.cultivo_id === "") return null;
  return entero(datos.cultivo_id, "cultivo_id", null, 1, 2147483647);
}

async function salud() {
  const inicio = performance.now();
  await query("SELECT 1");
  return { ok: true, baseDatos: "PostgreSQL en Supabase", latenciaMs: Math.round(performance.now() - inicio) };
}

async function proyecto() {
  const resultado = await query(
    "SELECT " +
    "(SELECT count(*) FROM public.cultivos) AS cultivos, " +
    "(SELECT count(*) FROM public.sensores) AS sensores, " +
    "(SELECT count(*) FROM public.lecturas) AS lecturas, " +
    "(SELECT count(*) FROM public.alertas) AS alertas"
  );
  return Object.fromEntries(Object.entries(resultado.rows[0]).map(([clave, valor]) => [clave, Number(valor)]));
}

async function cultivos() {
  const resultado = await query(
    "SELECT id, nombre, temp_min, temp_max, humedad_min, humedad_max, luz_min, luz_max " +
    "FROM public.cultivos ORDER BY nombre"
  );
  return resultado.rows;
}

async function listarSensores(qs) {
  const { pagina, limite, salto } = paginaDesde(qs);
  const buscar = texto(qs.get("buscar") ?? "", "buscar", 100);
  const valores = ["%" + buscar + "%"];
  const filtro = "WHERE ($1 = '%%' OR s.nombre ILIKE $1 OR s.ubicacion ILIKE $1 OR c.nombre ILIKE $1)";
  const total = await query(
    "SELECT count(*) FROM public.sensores s LEFT JOIN public.cultivos c ON c.id = s.cultivo_id " + filtro,
    valores
  );
  const filas = await query(
    "SELECT s.id, s.nombre, s.ubicacion, s.cultivo_id, s.simulado, s.estado, c.nombre AS cultivo " +
    "FROM public.sensores s LEFT JOIN public.cultivos c ON c.id = s.cultivo_id " + filtro +
    " ORDER BY s.id DESC LIMIT $2 OFFSET $3",
    [valores[0], limite, salto]
  );
  return { sensores: filas.rows, pagina, limite, total: Number(total.rows[0].count) };
}

async function verSensor(id) {
  const resultado = await query(
    "SELECT s.id, s.nombre, s.ubicacion, s.cultivo_id, s.simulado, s.estado, " +
    "c.nombre AS cultivo FROM public.sensores s " +
    "LEFT JOIN public.cultivos c ON c.id = s.cultivo_id WHERE s.id = $1",
    [id]
  );
  if (!resultado.rowCount) throw new ErrorApi(404, "No se encontró el sensor.");
  return resultado.rows[0];
}

async function crearSensor(datos) {
  objeto(datos);
  const nombre = texto(datos.nombre, "nombre", 60, true);
  const ubicacion = texto(datos.ubicacion, "ubicacion", 100, true);
  const simulado = booleano(datos.simulado, "simulado");
  const estado = datos.estado ?? "activo";
  if (!["activo", "inactivo", "mantenimiento"].includes(estado)) {
    throw new ErrorApi(400, "estado debe ser activo, inactivo o mantenimiento.");
  }
  const cultivoId = campoCultivo(datos);
  if (cultivoId) {
    const existe = await query("SELECT 1 FROM public.cultivos WHERE id = $1", [cultivoId]);
    if (!existe.rowCount) throw new ErrorApi(400, "El cultivo seleccionado no existe.");
  }
  const resultado = await query(
    "INSERT INTO public.sensores (nombre, ubicacion, cultivo_id, simulado, estado) " +
    "VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, ubicacion, cultivo_id, simulado, estado",
    [nombre, ubicacion, cultivoId ?? null, simulado, estado]
  );
  return resultado.rows[0];
}

async function modificarSensor(id, datos) {
  objeto(datos);
  const actual = await verSensor(id);
  const nombre = datos.nombre === undefined ? actual.nombre : texto(datos.nombre, "nombre", 60, true);
  const ubicacion = datos.ubicacion === undefined ? actual.ubicacion : texto(datos.ubicacion, "ubicacion", 100, true);
  const simulado = datos.simulado === undefined ? actual.simulado : booleano(datos.simulado, "simulado");
  const estado = datos.estado ?? actual.estado;
  if (!["activo", "inactivo", "mantenimiento"].includes(estado)) {
    throw new ErrorApi(400, "estado debe ser activo, inactivo o mantenimiento.");
  }
  const cultivoId = datos.cultivo_id === undefined ? actual.cultivo_id : campoCultivo(datos);
  if (cultivoId) {
    const existe = await query("SELECT 1 FROM public.cultivos WHERE id = $1", [cultivoId]);
    if (!existe.rowCount) throw new ErrorApi(400, "El cultivo seleccionado no existe.");
  }
  const resultado = await query(
    "UPDATE public.sensores SET nombre=$1, ubicacion=$2, cultivo_id=$3, simulado=$4, estado=$5 " +
    "WHERE id=$6 RETURNING id, nombre, ubicacion, cultivo_id, simulado, estado",
    [nombre, ubicacion, cultivoId, simulado, estado, id]
  );
  return resultado.rows[0];
}

async function eliminarSensor(id) {
  await verSensor(id);
  const dependencias = await query(
    "SELECT EXISTS(SELECT 1 FROM public.lecturas WHERE sensor_id=$1) OR " +
    "EXISTS(SELECT 1 FROM public.alertas WHERE sensor_id=$1) AS tiene_datos",
    [id]
  );
  if (dependencias.rows[0].tiene_datos) {
    throw new ErrorApi(409, "No se puede eliminar el sensor porque tiene lecturas o alertas relacionadas.");
  }
  await query("DELETE FROM public.sensores WHERE id = $1", [id]);
  return { eliminado: true };
}

async function listarLecturas(qs) {
  const { pagina, limite, salto } = paginaDesde(qs);
  const sensorId = qs.get("sensor_id")
    ? entero(qs.get("sensor_id"), "sensor_id", null, 1, 2147483647)
    : null;
  const inicio = qs.get("desde") ? fecha(qs.get("desde"), "desde") : null;
  const fin = qs.get("hasta") ? fecha(qs.get("hasta"), "hasta") : null;
  if (inicio && fin && inicio > fin) throw new ErrorApi(400, "desde debe ser anterior a hasta.");
  const condiciones = [];
  const valores = [];
  if (sensorId) { valores.push(sensorId); condiciones.push("l.sensor_id = $" + valores.length); }
  if (inicio) { valores.push(inicio); condiciones.push("l.fecha_hora >= $" + valores.length); }
  if (fin) { valores.push(fin); condiciones.push("l.fecha_hora <= $" + valores.length); }
  const filtro = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";
  const total = await query("SELECT count(*) FROM public.lecturas l " + filtro, valores);
  valores.push(limite, salto);
  const filas = await query(
    "SELECT l.id, l.sensor_id, s.nombre AS sensor, s.ubicacion, l.fecha_hora, " +
    "l.temperatura, l.humedad, l.luz FROM public.lecturas l " +
    "JOIN public.sensores s ON s.id = l.sensor_id " + filtro +
    " ORDER BY l.fecha_hora DESC, l.id DESC LIMIT $" + (valores.length - 1) +
    " OFFSET $" + valores.length,
    valores
  );
  return { lecturas: filas.rows, pagina, limite, total: Number(total.rows[0].count) };
}

async function verLectura(id) {
  const resultado = await query(
    "SELECT l.id, l.sensor_id, s.nombre AS sensor, s.ubicacion, l.fecha_hora, " +
    "l.temperatura, l.humedad, l.luz FROM public.lecturas l " +
    "JOIN public.sensores s ON s.id = l.sensor_id WHERE l.id = $1",
    [id]
  );
  if (!resultado.rowCount) throw new ErrorApi(404, "No se encontró la lectura.");
  return resultado.rows[0];
}

async function validarSensor(sensorId) {
  const resultado = await query("SELECT 1 FROM public.sensores WHERE id = $1", [sensorId]);
  if (!resultado.rowCount) throw new ErrorApi(400, "El sensor seleccionado no existe.");
}

function datosLectura(datos, actual) {
  objeto(datos);
  const sensorId = datos.sensor_id === undefined && actual
    ? actual.sensor_id
    : entero(datos.sensor_id, "sensor_id", null, 1, 2147483647);
  const temperatura = datos.temperatura === undefined && actual
    ? actual.temperatura
    : decimal(datos.temperatura, "temperatura", -999.99, 999.99);
  const humedad = datos.humedad === undefined && actual
    ? actual.humedad
    : decimal(datos.humedad, "humedad", 0, 100);
  const luz = datos.luz === undefined && actual
    ? actual.luz
    : decimal(datos.luz, "luz", 0, 9999999.99);
  const fechaHora = datos.fecha_hora === undefined
    ? actual ? actual.fecha_hora : new Date().toISOString()
    : fecha(datos.fecha_hora, "fecha_hora");
  return { sensorId, temperatura, humedad, luz, fechaHora };
}

async function crearLectura(datos) {
  const lectura = datosLectura(datos);
  await validarSensor(lectura.sensorId);
  const resultado = await query(
    "INSERT INTO public.lecturas (sensor_id, temperatura, humedad, luz, fecha_hora) " +
    "VALUES ($1, $2, $3, $4, $5) RETURNING id, sensor_id, temperatura, humedad, luz, fecha_hora",
    [lectura.sensorId, lectura.temperatura, lectura.humedad, lectura.luz, lectura.fechaHora]
  );
  return resultado.rows[0];
}

async function modificarLectura(id, datos) {
  const actual = await verLectura(id);
  const lectura = datosLectura(datos, actual);
  await validarSensor(lectura.sensorId);
  const resultado = await query(
    "UPDATE public.lecturas SET sensor_id=$1, temperatura=$2, humedad=$3, luz=$4, fecha_hora=$5 " +
    "WHERE id=$6 RETURNING id, sensor_id, temperatura, humedad, luz, fecha_hora",
    [lectura.sensorId, lectura.temperatura, lectura.humedad, lectura.luz, lectura.fechaHora, id]
  );
  return resultado.rows[0];
}

async function eliminarLectura(id) {
  await verLectura(id);
  await query("DELETE FROM public.lecturas WHERE id = $1", [id]);
  return { eliminado: true };
}

async function reporteAmbiente(qs) {
  const sensorId = qs.get("sensor_id")
    ? entero(qs.get("sensor_id"), "sensor_id", null, 1, 2147483647)
    : null;
  const inicio = qs.get("desde") ? fecha(qs.get("desde"), "desde") : null;
  const fin = qs.get("hasta") ? fecha(qs.get("hasta"), "hasta") : null;
  if (inicio && fin && inicio > fin) throw new ErrorApi(400, "desde debe ser anterior a hasta.");
  const resultado = await query(
    "SELECT s.id AS sensor_id, s.nombre AS sensor, c.nombre AS cultivo, " +
    "count(l.id) AS cantidad, round(avg(l.temperatura), 2) AS temp_promedio, " +
    "round(avg(l.humedad), 2) AS humedad_promedio, round(avg(l.luz), 2) AS luz_promedio, " +
    "max(l.fecha_hora) AS ultima_lectura FROM public.sensores s " +
    "LEFT JOIN public.cultivos c ON c.id = s.cultivo_id " +
    "LEFT JOIN public.lecturas l ON l.sensor_id = s.id " +
    "AND ($1::integer IS NULL OR l.sensor_id = $1) " +
    "AND ($2::timestamptz IS NULL OR l.fecha_hora >= $2) " +
    "AND ($3::timestamptz IS NULL OR l.fecha_hora <= $3) " +
    "GROUP BY s.id, s.nombre, c.nombre ORDER BY s.nombre",
    [sensorId, inicio, fin]
  );
  return { reporte: resultado.rows };
}

module.exports = {
  ErrorApi, salud, proyecto, cultivos,
  listarSensores, verSensor, crearSensor, modificarSensor, eliminarSensor,
  listarLecturas, verLectura, crearLectura, modificarLectura, eliminarLectura,
  reporteAmbiente
};
