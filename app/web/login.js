const formLogin = document.querySelector("#form-login");
const avisoLogin = document.querySelector("#login-aviso");
const botonLogin = document.querySelector("#login-submit");

fetch("/api/auth/me", { cache: "no-store" })
  .then(respuesta => respuesta.json())
  .then(datos => {
    if (datos.autenticado) {
      window.location.replace("/");
    }
  })
  .catch(() => {});

formLogin.addEventListener("submit", async evento => {
  evento.preventDefault();
  avisoLogin.textContent = "";
  botonLogin.disabled = true;

  try {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: document
          .querySelector("#login-nombre")
          .value.trim(),
        contra: document.querySelector("#login-contra").value
      })
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        datos.error || "No se pudo iniciar sesión."
      );
    }

    window.location.replace("/");
  } catch (error) {
    avisoLogin.textContent =
      error.message || "No se pudo contactar al servidor.";
  } finally {
    botonLogin.disabled = false;
  }
});