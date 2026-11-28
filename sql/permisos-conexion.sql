-- Ejecutar en SQL Editor tras cargar agrosense-esquema-inicial.sql.
-- Esta etapa concede acceso de lectura a un rol exclusivo de la aplicación.

BEGIN;

DO $crear_rol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agrosense_app') THEN
    CREATE ROLE agrosense_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END;
$crear_rol$;

GRANT USAGE ON SCHEMA agrosense TO agrosense_app;
GRANT SELECT ON agrosense.sensores, agrosense.lecturas TO agrosense_app;

ALTER TABLE agrosense.sensores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrosense.lecturas ENABLE ROW LEVEL SECURITY;

DO $politicas$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'agrosense' AND tablename = 'sensores'
      AND policyname = 'agrosense_app_lee_sensores'
  ) THEN
    CREATE POLICY agrosense_app_lee_sensores ON agrosense.sensores
      FOR SELECT TO agrosense_app USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'agrosense' AND tablename = 'lecturas'
      AND policyname = 'agrosense_app_lee_lecturas'
  ) THEN
    CREATE POLICY agrosense_app_lee_lecturas ON agrosense.lecturas
      FOR SELECT TO agrosense_app USING (true);
  END IF;
END;
$politicas$;

COMMIT;

SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'agrosense'
  AND policyname IN ('agrosense_app_lee_sensores', 'agrosense_app_lee_lecturas')
ORDER BY tablename;
