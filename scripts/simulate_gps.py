#!/usr/bin/env python3
"""Envía posiciones como lo haría un dispositivo GPS (solo biblioteca estándar).

    GPS_TOKEN=<token> python3 scripts/simulate_gps.py                 # recorre Bucaramanga
    GPS_TOKEN=<token> python3 scripts/simulate_gps.py --salir         # sale de la zona a mitad de camino
    GPS_TOKEN=<token> python3 scripts/simulate_gps.py --url https://…/api/telemetry/positions

El token se crea en Panel > Operación > Dispositivos GPS y solo se lee del
entorno, para que no quede en el historial de la terminal.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROUTE = [(7.1193, -73.1227), (7.1130, -73.1180), (7.1050, -73.1130), (7.0960, -73.1100), (7.0870, -73.1050)]
FAR_AWAY = (7.4500, -73.2000)  # fuera del área metropolitana


def interpolate(route, steps):
    for (a_lat, a_lng), (b_lat, b_lng) in zip(route, route[1:], strict=False):
        for i in range(steps):
            ratio = i / steps
            yield a_lat + (b_lat - a_lat) * ratio, a_lng + (b_lng - a_lng) * ratio
    yield route[-1]


def send(url, token, lat, lng, battery):
    body = json.dumps({"latitude": round(lat, 6), "longitude": round(lng, 6), "batteryPct": battery}).encode()
    request = urllib.request.Request(
        url, body, {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST"
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:3000/api/telemetry/positions")
    parser.add_argument("--intervalo", type=float, default=3.0, help="segundos entre posiciones (mínimo 1)")
    parser.add_argument("--pasos", type=int, default=6, help="posiciones entre dos puntos de la ruta")
    parser.add_argument("--salir", action="store_true", help="sale de la zona permitida a mitad de camino")
    args = parser.parse_args()

    token = os.environ.get("GPS_TOKEN")
    if not token:
        sys.exit("Define GPS_TOKEN con el token del dispositivo.")

    points = list(interpolate(ROUTE, args.pasos))
    if args.salir:
        points.insert(len(points) // 2, FAR_AWAY)
    battery = 100
    for lat, lng in points:
        try:
            result = send(args.url, token, lat, lng, battery)
        except urllib.error.HTTPError as error:
            sys.exit(f"El servidor respondió {error.code}: {error.read().decode(errors='replace')[:200]}")
        except urllib.error.URLError as error:
            sys.exit(f"No se pudo conectar: {error.reason}")
        zone = "FUERA DE ZONA" if result["outsideZone"] else "en zona"
        print(f"{lat:.5f}, {lng:.5f}  {zone}", flush=True)
        battery = max(5, battery - 1)
        time.sleep(max(args.intervalo, 1.0))


if __name__ == "__main__":
    main()
