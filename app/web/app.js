const estado = document.querySelector("#estado");
const avisos = {
  sensores: document.querySelector("#aviso-sensores"),
  lecturas: document.querySelector("#aviso-lecturas"),
  reporte: document.querySelector("#aviso-reporte")
};
const paginaSensores = { numero: 1, limite: 10, total: 0, buscar: "" };
const paginaLecturas = { numero: 1, limite: 10, total: 0, sensorId: "" };

async function api(ruta, opciones = {}) {
  const respuesta = await fetch("/api" + ruta, {
    ...opciones,
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...opciones.headers
    }
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error || "La solicitud no se pudo completar.");
  return datos;
}

function celda(fila, valor) {
  const td = document.createElement("td");
  td.textContent = valor === null || valor === undefined || valor === "" ? "—" : valor;
  fila.append(td);
  return td;
}

function boton(texto, clase, accion, etiqueta) {
  const elemento = document.createElement("button");
  elemento.type = "button";
  elemento.className = "boton boton-texto " + clase;
  elemento.textContent = texto;
  elemento.setAttribute("aria-label", etiqueta);
  elemento.addEventListener("click", accion);
  return elemento;
}

function mostrarAviso(tipo, mensaje = "", estadoMensaje = "") {
  const elemento = avisos[tipo];
  elemento.textContent = mensaje;
  elemento.className = "aviso " + estadoMensaje;
}

function mostrarError(tipo, error) {
  mostrarAviso(tipo, error.message, "error");
}

function fechaLegible(valor) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}

function queryPaginada(pagina, valores = {}) {
  const params = new URLSearchParams({
    pagina: String(pagina.numero),
    limite: String(pagina.limite),
    ...valores
  });
  return "?" + params;
}

function ajustarPaginacion(nombre, pagina) {
  document.querySelector("#" + nombre + "-pagina").textContent = "Página " + pagina.numero;
  document.querySelector("#" + nombre + "-anterior").disabled = pagina.numero <= 1;
  document.querySelector("#" + nombre + "-siguiente").disabled =
    pagina.numero * pagina.limite >= pagina.total;
}

async function cargarResumen() {
  const resumen = await api("/proyecto");
  document.querySelector("#total-sensores").textContent = resumen.sensores;
  document.querySelector("#total-lecturas").textContent = resumen.lecturas;
  document.querySelector("#total-cultivos").textContent = resumen.cultivos;
  document.querySelector("#total-alertas").textContent = resumen.alertas;
}

async function cargarCultivos() {
  const cultivos = await api("/cultivos");
  const selector = document.querySelector("#sensor-cultivo");
  selector.replaceChildren(new Option("Sin cultivo asignado", ""));
  for (const cultivo of cultivos) selector.add(new Option(cultivo.nombre, cultivo.id));
}

async function cargarSensoresSelect() {
  const { sensores } = await api("/sensores?pagina=1&limite=100");
  const selectores = ["#filtro-sensor", "#lectura-sensor"].map(selector => document.querySelector(selector));
  selectores[0].replaceChildren(new Option("Todos los sensores", ""));
  selectores[1].replaceChildren(new Option("Selecciona un sensor", ""));
  for (const sensor of sensores) {
    selectores[0].add(new Option(sensor.nombre, sensor.id));
    selectores[1].add(new Option(sensor.nombre, sensor.id));
  }
}

async function cargarSensores() {
  try {
    const datos = await api("/sensores" + queryPaginada(paginaSensores, { buscar: paginaSensores.buscar }));
    mostrarAviso("sensores");
    paginaSensores.total = datos.total;
    const tabla = document.querySelector("#tabla-sensores");
    tabla.replaceChildren();
    for (const sensor of datos.sensores) {
      const fila = document.createElement("tr");
      celda(fila, sensor.nombre);
      celda(fila, sensor.ubicacion);
      celda(fila, sensor.cultivo);
      const estadoCelda = celda(fila, "");
      const estadoEtiqueta = document.createElement("span");
      estadoEtiqueta.className = "etiqueta " + sensor.estado;
      estadoEtiqueta.textContent = sensor.estado;
      estadoCelda.replaceChildren(estadoEtiqueta);
      celda(fila, sensor.simulado ? "Simulado" : "Físico");
      const acciones = celda(fila, "");
      acciones.className = "acciones-tabla";
      acciones.append(boton("Ver", "", () => verDetalleSensor(sensor.id), "Ver detalle de " + sensor.nombre));
      acciones.append(boton("Editar", "", () => editarSensor(sensor), "Editar " + sensor.nombre));
      acciones.append(boton("Eliminar", "boton-peligro", () => borrarSensor(sensor), "Eliminar " + sensor.nombre));
      tabla.append(fila);
    }
    if (!datos.sensores.length) {
      const fila = document.createElement("tr");
      const celdaVacia = celda(fila, "No hay sensores que coincidan con la búsqueda.");
      celdaVacia.colSpan = 6;
      tabla.append(fila);
    }
    ajustarPaginacion("sensores", paginaSensores);
    await cargarSensoresSelect();
  } catch (error) {
    mostrarError("sensores", error);
  }
}

function limpiarSensor() {
  document.querySelector("#form-sensor").reset();
  document.querySelector("#sensor-id").value = "";
  document.querySelector("#guardar-sensor").textContent = "Agregar sensor";
  document.querySelector("#cancelar-sensor").classList.add("oculto");
}

function editarSensor(sensor) {
  document.querySelector("#sensor-id").value = sensor.id;
  document.querySelector("#sensor-nombre").value = sensor.nombre;
  document.querySelector("#sensor-ubicacion").value = sensor.ubicacion;
  document.querySelector("#sensor-cultivo").value = sensor.cultivo_id || "";
  document.querySelector("#sensor-estado").value = sensor.estado;
  document.querySelector("#sensor-simulado").checked = sensor.simulado;
  document.querySelector("#guardar-sensor").textContent = "Guardar cambios";
  document.querySelector("#cancelar-sensor").classList.remove("oculto");
  document.querySelector("#sensor-nombre").focus();
}

async function verDetalleSensor(id) {
  try {
    const sensor = await api("/sensores/" + id);
    document.querySelector("#detalle-sensor-nombre").textContent = sensor.nombre;
    document.querySelector("#detalle-sensor-ubicacion").textContent = sensor.ubicacion;
    document.querySelector("#detalle-sensor-cultivo").textContent = sensor.cultivo || "Sin cultivo asignado";
    document.querySelector("#detalle-sensor-estado").textContent = sensor.estado;
    document.querySelector("#detalle-sensor-tipo").textContent = sensor.simulado ? "Simulado" : "Físico";
    document.querySelector("#detalle-sensor-editar").onclick = () => {
      document.querySelector("#detalle-sensor").close();
      editarSensor(sensor);
    };
    document.querySelector("#detalle-sensor-eliminar").onclick = async () => {
      document.querySelector("#detalle-sensor").close();
      await borrarSensor(sensor);
    };
    document.querySelector("#detalle-sensor").showModal();
  } catch (error) {
    mostrarError("sensores", error);
  }
}

async function borrarSensor(sensor) {
  if (!confirm("¿Eliminar el sensor " + sensor.nombre + "?")) return;
  try {
    await api("/sensores/" + sensor.id, { method: "DELETE" });
    mostrarAviso("sensores", "Sensor eliminado.", "exito");
    await actualizarTodo();
  } catch (error) {
    mostrarError("sensores", error);
  }
}

async function cargarLecturas() {
  try {
    const datos = await api("/lecturas" + queryPaginada(paginaLecturas, {
      sensor_id: paginaLecturas.sensorId
    }));
    mostrarAviso("lecturas");
    paginaLecturas.total = datos.total;
    const tabla = document.querySelector("#tabla-lecturas");
    tabla.replaceChildren();
    for (const lectura of datos.lecturas) {
      const fila = document.createElement("tr");
      celda(fila, fechaLegible(lectura.fecha_hora));
      celda(fila, lectura.sensor);
      celda(fila, lectura.temperatura + " °C");
      celda(fila, lectura.humedad + " %");
      celda(fila, lectura.luz + " lux");
      const acciones = celda(fila, "");
      acciones.className = "acciones-tabla";
      acciones.append(boton("Editar", "", () => editarLectura(lectura), "Editar lectura " + lectura.id));
      acciones.append(boton("Eliminar", "boton-peligro", () => borrarLectura(lectura), "Eliminar lectura " + lectura.id));
      tabla.append(fila);
    }
    if (!datos.lecturas.length) {
      const fila = document.createElement("tr");
      const celdaVacia = celda(fila, "Todavía no hay lecturas registradas.");
      celdaVacia.colSpan = 6;
      tabla.append(fila);
    }
    ajustarPaginacion("lecturas", paginaLecturas);
  } catch (error) {
    mostrarError("lecturas", error);
  }
}

async function editarLectura(lectura) {
  const temperatura = prompt("Temperatura en °C:", lectura.temperatura);
  if (temperatura === null) return;
  const humedad = prompt("Humedad en %:", lectura.humedad);
  if (humedad === null) return;
  const luz = prompt("Intensidad de luz en lux:", lectura.luz);
  if (luz === null) return;
  try {
    await api("/lecturas/" + lectura.id, {
      method: "PATCH",
      body: JSON.stringify({ temperatura, humedad, luz })
    });
    mostrarAviso("lecturas", "Lectura actualizada.", "exito");
    await actualizarTodo();
  } catch (error) {
    mostrarError("lecturas", error);
  }
}

async function borrarLectura(lectura) {
  if (!confirm("¿Eliminar la lectura #" + lectura.id + "?")) return;
  try {
    await api("/lecturas/" + lectura.id, { method: "DELETE" });
    mostrarAviso("lecturas", "Lectura eliminada.", "exito");
    await actualizarTodo();
  } catch (error) {
    mostrarError("lecturas", error);
  }
}

async function cargarReporte() {
  try {
    const { reporte } = await api("/reportes/ambiente");
    mostrarAviso("reporte");
    const tabla = document.querySelector("#tabla-reporte");
    tabla.replaceChildren();
    for (const item of reporte) {
      const fila = document.createElement("tr");
      celda(fila, item.sensor);
      celda(fila, item.cultivo);
      celda(fila, item.cantidad);
      celda(fila, item.temp_promedio === null ? "—" : item.temp_promedio + " °C");
      celda(fila, item.humedad_promedio === null ? "—" : item.humedad_promedio + " %");
      celda(fila, item.luz_promedio === null ? "—" : item.luz_promedio + " lux");
      celda(fila, fechaLegible(item.ultima_lectura));
      tabla.append(fila);
    }
    if (!reporte.length) {
      const fila = document.createElement("tr");
      const celdaVacia = celda(fila, "Agrega un sensor para comenzar el resumen.");
      celdaVacia.colSpan = 7;
      tabla.append(fila);
    }
  } catch (error) {
    mostrarError("reporte", error);
  }
}

async function actualizarTodo() {
  await Promise.all([
    cargarResumen(),
    cargarSensores(),
    cargarLecturas(),
    cargarReporte()
  ]);
}

document.querySelector("#form-sensor").addEventListener("submit", async evento => {
  evento.preventDefault();
  const id = document.querySelector("#sensor-id").value;
  const datos = {
    nombre: document.querySelector("#sensor-nombre").value,
    ubicacion: document.querySelector("#sensor-ubicacion").value,
    cultivo_id: document.querySelector("#sensor-cultivo").value || null,
    estado: document.querySelector("#sensor-estado").value,
    simulado: document.querySelector("#sensor-simulado").checked
  };
  try {
    await api(id ? "/sensores/" + id : "/sensores", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(datos)
    });
    limpiarSensor();
    mostrarAviso("sensores", id ? "Sensor actualizado." : "Sensor agregado.", "exito");
    await actualizarTodo();
  } catch (error) {
    mostrarError("sensores", error);
  }
});

document.querySelector("#cancelar-sensor").addEventListener("click", limpiarSensor);
document.querySelector("#buscar-sensores").addEventListener("submit", evento => {
  evento.preventDefault();
  paginaSensores.buscar = document.querySelector("#buscar").value.trim();
  paginaSensores.numero = 1;
  cargarSensores();
});
document.querySelector("#sensores-anterior").addEventListener("click", () => {
  paginaSensores.numero--;
  cargarSensores();
});
document.querySelector("#sensores-siguiente").addEventListener("click", () => {
  paginaSensores.numero++;
  cargarSensores();
});
document.querySelector("#filtro-sensor").addEventListener("change", evento => {
  paginaLecturas.sensorId = evento.target.value;
  paginaLecturas.numero = 1;
  cargarLecturas();
});
document.querySelector("#lecturas-anterior").addEventListener("click", () => {
  paginaLecturas.numero--;
  cargarLecturas();
});
document.querySelector("#lecturas-siguiente").addEventListener("click", () => {
  paginaLecturas.numero++;
  cargarLecturas();
});
document.querySelector("#form-lectura").addEventListener("submit", async evento => {
  evento.preventDefault();
  const datos = {
    sensor_id: document.querySelector("#lectura-sensor").value,
    temperatura: document.querySelector("#lectura-temperatura").value,
    humedad: document.querySelector("#lectura-humedad").value,
    luz: document.querySelector("#lectura-luz").value
  };
  try {
    await api("/lecturas", { method: "POST", body: JSON.stringify(datos) });
    document.querySelector("#form-lectura").reset();
    mostrarAviso("lecturas", "Lectura registrada.", "exito");
    await actualizarTodo();
  } catch (error) {
    mostrarError("lecturas", error);
  }
});
document.querySelector("#actualizar").addEventListener("click", actualizarTodo);
document.querySelector("#actualizar-reporte").addEventListener("click", cargarReporte);

api("/salud")
  .then(datos => {
    estado.textContent = "Supabase conectado · " + datos.latenciaMs + " ms";
    estado.setAttribute("aria-live", "polite");
  })
  .catch(error => {
    estado.textContent = "Sin conexión a Supabase";
    mostrarError("sensores", error);
  });

async function iniciar() {
  try {
    await cargarCultivos();
    await actualizarTodo();
  } catch (error) {
    estado.textContent = "No se pudieron cargar los datos";
    mostrarError("sensores", error);
  }
}
iniciar();
