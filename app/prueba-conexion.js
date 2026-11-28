const { query, cerrar, describirError } = require("./bd");

async function probar() {
  const resultado = await query(
    "SELECT " +
    "(SELECT count(*) FROM public.cultivos) AS cultivos, " +
    "(SELECT count(*) FROM public.sensores) AS sensores, " +
    "(SELECT count(*) FROM public.lecturas) AS lecturas, " +
    "(SELECT count(*) FROM public.alertas) AS alertas"
  );
  console.log("Conexión a PostgreSQL en Supabase correcta.");
  for (const [tabla, total] of Object.entries(resultado.rows[0])) {
    console.log(tabla + ": " + total);
  }
}

probar()
  .catch(error => {
    console.error(describirError(error));
    process.exitCode = 1;
  })
  .finally(cerrar);
