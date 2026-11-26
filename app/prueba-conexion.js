const { comprobarConexion, consultarProyecto, cerrar, describirError } = require("./bd");

async function probar() {
  const conexion = await comprobarConexion();
  const datos = await consultarProyecto();
  console.log("Conexión con " + conexion.baseDatos + " (" + conexion.latenciaMs + " ms)");
  console.log("Sensores: " + datos.sensores);
  console.log("Lecturas: " + datos.lecturas);
}

probar()
  .catch(error => {
    console.error(describirError(error));
    process.exitCode = 1;
  })
  .finally(cerrar);
