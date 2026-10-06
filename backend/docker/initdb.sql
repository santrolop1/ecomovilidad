-- Se ejecuta una sola vez, al crear el volumen de datos.
CREATE EXTENSION IF NOT EXISTS postgis;
-- Base de pruebas aislada para pytest.
CREATE DATABASE ecomovilidad_test OWNER ecomovilidad;
\connect ecomovilidad_test
CREATE EXTENSION IF NOT EXISTS postgis;
