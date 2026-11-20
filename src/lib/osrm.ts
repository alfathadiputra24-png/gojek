import { haversineKm } from './pricing';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: Array<[number, number]>; // [lat, lng]
  source: 'osrm' | 'fallback';
}

export async function fetchOsrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const resp = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!resp.ok) throw new Error('OSRM non-200');
    const data = (await resp.json()) as {
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };
    const route = data.routes?.[0];
    if (!route || !route.geometry?.coordinates?.length) {
      throw new Error('OSRM empty route');
    }
    return {
      distanceKm: Math.max(0.5, Number((route.distance / 1000).toFixed(2))),
      durationMin: Math.max(3, Math.round(route.duration / 60)),
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: 'osrm',
    };
  } catch {
    window.clearTimeout(timer);
    const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
    const steps = 16;
    const coords: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arc = Math.sin(t * Math.PI) * 0.0025;
      coords.push([
        from.lat + (to.lat - from.lat) * t + arc,
        from.lng + (to.lng - from.lng) * t - arc * 0.6,
      ]);
    }
    return {
      distanceKm: km,
      durationMin: Math.max(4, Math.round(km * 3.5)),
      coordinates: coords,
      source: 'fallback',
    };
  }
}
