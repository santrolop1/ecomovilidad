# PostgreSQL 16 oficial + PostGIS 3 (repositorio PGDG). Multi-arquitectura:
# funciona en Apple Silicon (arm64) y en x86_64, a diferencia de postgis/postgis.
FROM postgres:16-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
