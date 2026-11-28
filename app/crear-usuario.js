const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { query, cerrar } = require("./bd");
const { hashPassword } = require("./auth");

function leerOculto(mensaje) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error("Ejecuta este comando desde la terminal interactiva del Codespace.")
    );
  }

  stdout.write(mensaje);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let valor = "";

    const terminar = () => {
      stdin.off("data", alEscribir);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };

    const alEscribir = datos => {
      for (const caracter of datos.toString("utf8")) {
        if (caracter === "\u0003") {
          terminar();
          reject(new Error("Operación cancelada."));
          return;
        }

        if (caracter === "\r" || caracter === "\n") {
          terminar();
          resolve(valor);
          return;
        }

        if (caracter === "\u007f" || caracter === "\b") {
          if (valor.length) {
            valor = valor.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }

        if (caracter >= " ") {
          valor += caracter;
          stdout.write("*");
        }
      }
    };

    stdin.on("data", alEscribir);
  });
}

async function main() {
  const terminal = readline.createInterface({
    input: stdin,
    output: stdout
  });

  let nombre;
  let puesto;

  try {
    nombre = (await terminal.question("Nombre de usuario: ")).trim();
    puesto = (
      await terminal.question("Puesto (encargado/admin): ")
    ).trim().toLowerCase();
  } finally {
    terminal.close();
  }

  if (!nombre || nombre.length > 100) {
    throw new Error("El nombre debe tener entre 1 y 100 caracteres.");
  }

  if (!["encargado", "admin"].includes(puesto)) {
    throw new Error("El puesto debe ser encargado o admin.");
  }

  const contraseña = await leerOculto(
    "Contraseña (mínimo 10 caracteres): "
  );
  const confirmacion = await leerOculto("Repite la contraseña: ");

  if (contraseña.length < 10) {
    throw new Error("Usa una contraseña de al menos 10 caracteres.");
  }

  if (contraseña !== confirmacion) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const contra = await hashPassword(contraseña);

  const resultado = await query(
    `INSERT INTO public.usuarios (nombre, contra, puesto)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, puesto`,
    [nombre, contra, puesto]
  );

  console.log("Usuario creado:", resultado.rows[0]);
}

main()
  .catch(error => {
    if (error.code === "23505") {
      console.error("Ya existe un usuario con ese nombre.");
    } else {
      console.error(error.message || "No se pudo crear el usuario.");
    }

    process.exitCode = 1;
  })
  .finally(cerrar);