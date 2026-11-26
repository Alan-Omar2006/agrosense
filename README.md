# AgroSense Unidad III

Primera etapa de la actividad de Bases de Datos en la Nube. La API de Node.js consulta el esquema `agrosense` de PostgreSQL en Supabase.

## 1. Preparar el repositorio

Copia la carpeta `app`, la carpeta `sql` y los archivos de esta entrega a la raíz del repositorio privado de AgroSense. Abre un Codespace desde **Code → Codespaces → Create codespace on main**.

## 2. Dar acceso a la aplicación

1. En Supabase, abre **SQL Editor → New query**, pega `sql/permisos-conexion.sql` y ejecuta el archivo completo. El resultado debe listar las políticas de lectura de `sensores` y `lecturas` para `agrosense_app`.
2. En la parte superior del proyecto, abre **Connect → Session pooler**. Anota el host y el usuario administrador que muestra Supabase. El usuario tiene el formato `postgres.REF_DEL_PROYECTO`. Descarga el certificado de la CA desde la configuración de la base de datos de Supabase y súbelo al Codespace. Guarda el archivo fuera del repositorio, por ejemplo en `$HOME/.postgresql/agrosense-ca.crt`.
3. En la terminal de Codespaces, comprueba que exista `psql` con `psql --version`. Si hace falta el cliente en el Codespace estándar de Ubuntu, ejecuta `sudo apt-get update` y después `sudo apt-get install -y postgresql-client`.
4. Ejecuta el siguiente comando con tu host y referencia. La terminal te pedirá la contraseña de administrador de la base. Después te pedirá dos veces la contraseña nueva de `agrosense_app`. El comando `\password` evita que la contraseña quede en el historial de la terminal o en el SQL guardado.

```bash
psql -W "host=HOST_DEL_POOLER port=5432 dbname=postgres user=postgres.REF_DEL_PROYECTO sslmode=verify-full sslrootcert=$HOME/.postgresql/agrosense-ca.crt" -c '\password agrosense_app'
```

## 3. Guardar el secreto de Codespaces

Ve al repositorio en GitHub y abre **Settings → Secrets and variables → Codespaces**. Crea el secreto `DATABASE_URL` con la URI de **Session pooler**, usando el usuario y la contraseña de `agrosense_app`.

```text
postgresql://agrosense_app.REF_DEL_PROYECTO:CLAVE_DE_LA_APP@HOST_DEL_POOLER:5432/postgres
```

Sustituye los tres marcadores con tus datos. Si la contraseña contiene caracteres reservados como `@`, `#` o `/`, usa su codificación porcentual en la URI. Reinicia el Codespace tras guardar el secreto. Usa el certificado de Supabase para que el driver verifique TLS.

## 4. Probar la conexión

```bash
cd app
npm install
export DATABASE_CA_FILE="$HOME/.postgresql/agrosense-ca.crt"
npm run test:conexion
```

El resultado esperado es una conexión a PostgreSQL en Supabase y el conteo de **2 sensores y 24 lecturas** de la carga inicial. Toma una captura del resultado y otra de la lista de secretos de Codespaces donde se vea el nombre `DATABASE_URL` con su valor oculto.

## 5. Probar las rutas iniciales

Inicia el servidor con `npm start` desde la misma terminal. Mantén el puerto 3000 en **Private**. En una segunda terminal ejecuta los comandos de prueba.

```bash
curl -i http://localhost:3000/api/salud
curl -i http://localhost:3000/api/proyecto
```

| Método y ruta | Resultado esperado |
| --- | --- |
| GET /api/salud | HTTP 200 con el estado de conexión y la latencia en milisegundos |
| GET /api/proyecto | HTTP 200 con el nombre del proyecto y los conteos de las dos tablas |

- [Supabase · conexión con psql](https://supabase.com/docs/guides/database/psql)
- [GitHub · secretos en Codespaces](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)
