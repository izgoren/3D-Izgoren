import JSZip from 'jszip';
import { ParcelCoordinate, ParcelInfo } from '../types';

// Earth radius in meters
const EARTH_RADIUS = 6378137;

/**
 * Calculates polygon perimeter in meters using the Haversine formula
 */
export function calculatePerimeter(coords: ParcelCoordinate[]): number {
  if (coords.length < 2) return 0;
  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    const nextIdx = (i + 1) % coords.length;
    const p1 = coords[i];
    const p2 = coords[nextIdx];
    totalDist += haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }

  return Math.round(totalDist * 10) / 10;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * Calculates geodesic polygon area in square meters using spherical excess
 */
export function calculateArea(coords: ParcelCoordinate[]): number {
  if (coords.length < 3) return 0;

  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len;
    const p1 = coords[i];
    const p2 = coords[j];

    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const dLonRad = ((p2.lng - p1.lng) * Math.PI) / 180;

    total += dLonRad * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }

  const area = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 4);
  return Math.round(area * 10) / 10;
}

/**
 * Calculates center (centroid) of parcel coordinates
 */
export function calculateCentroid(coords: ParcelCoordinate[]): ParcelCoordinate {
  if (coords.length === 0) return { lng: 28.981, lat: 40.224 };
  let sumLng = 0;
  let sumLat = 0;

  coords.forEach((c) => {
    sumLng += c.lng;
    sumLat += c.lat;
  });

  return {
    lng: sumLng / coords.length,
    lat: sumLat / coords.length,
  };
}

/**
 * Formats area into m², Dönüm and Hectare
 */
export function formatArea(areaM2: number): { m2: string; donum: string; hectare: string } {
  const m2Str = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(areaM2) + ' m²';
  const donumVal = areaM2 / 1000;
  const donumStr = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(donumVal) + ' Dönüm';
  const hectareVal = areaM2 / 10000;
  const hectareStr = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(hectareVal) + ' Hektar';

  return { m2: m2Str, donum: donumStr, hectare: hectareStr };
}

/**
 * Parse KML XML string to extract coordinates
 */
export function parseKMLString(kmlText: string, defaultName = 'Yüklenen Parsel'): ParcelInfo | null {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(kmlText, 'text/xml');

    // Check for parse error
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      throw new Error('Geçersiz KML formatı');
    }

    // Try finding placemark name
    const nameNode = xml.querySelector('Placemark > name, name');
    const name = nameNode?.textContent?.trim() || defaultName;

    // Search for coordinates tags
    const coordNodes = xml.querySelectorAll('coordinates');
    if (coordNodes.length === 0) {
      throw new Error('KML dosyasında <coordinates> etiketi bulunamadı');
    }

    let parsedCoords: ParcelCoordinate[] = [];

    // Find the longest coordinate chain (likely the main polygon boundary)
    for (let i = 0; i < coordNodes.length; i++) {
      const text = coordNodes[i].textContent || '';
      const rawPoints = text.trim().split(/\s+/);
      const points: ParcelCoordinate[] = [];

      for (const pt of rawPoints) {
        const parts = pt.split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          points.push({
            lng: parts[0],
            lat: parts[1],
            alt: parts[2] || 0,
          });
        }
      }

      if (points.length > parsedCoords.length) {
        parsedCoords = points;
      }
    }

    if (parsedCoords.length < 3) {
      throw new Error('Yeterli koordinat noktası bulunamadı (en az 3 nokta gerekli)');
    }

    // Ensure polygon is closed
    const first = parsedCoords[0];
    const last = parsedCoords[parsedCoords.length - 1];
    if (first.lng !== last.lng || first.lat !== last.lat) {
      parsedCoords.push({ ...first });
    }

    const area = calculateArea(parsedCoords);
    const perimeter = calculatePerimeter(parsedCoords);

    return {
      id: 'kml-' + Date.now(),
      name,
      city: 'Özel Konum',
      areaM2: area,
      perimeterM: perimeter,
      coordinates: parsedCoords,
    };
  } catch (err: any) {
    console.error('KML Parse error:', err);
    throw new Error(err.message || 'KML ayrıştırılamadı');
  }
}

/**
 * Parse KMZ File (Zip containing doc.kml or similar)
 */
export async function parseKMZFile(file: File): Promise<ParcelInfo> {
  const zip = await JSZip.loadAsync(file);
  const kmlFileName = Object.keys(zip.files).find((f) => f.toLowerCase().endsWith('.kml'));

  if (!kmlFileName) {
    throw new Error('KMZ arşivi içerisinde .kml dosyası bulunamadı');
  }

  const kmlText = await zip.files[kmlFileName].async('string');
  const result = parseKMLString(kmlText, file.name.replace(/\.[^/.]+$/, ''));
  if (!result) throw new Error('KMZ içindeki KML okunamadı');
  return result;
}

/**
 * Parse GeoJSON or JSON string
 */
export function parseGeoJSON(jsonText: string, defaultName = 'GeoJSON Parsel'): ParcelInfo {
  const json = JSON.parse(jsonText);
  let coordsArray: any[] = [];
  let detectedName = defaultName;

  if (json.type === 'FeatureCollection' && json.features?.length > 0) {
    const feat = json.features[0];
    if (feat.properties?.name) detectedName = feat.properties.name;
    if (feat.properties?.ada && feat.properties?.parsel) {
      detectedName = `Ada ${feat.properties.ada} / Parsel ${feat.properties.parsel}`;
    }
    coordsArray = feat.geometry?.coordinates;
  } else if (json.type === 'Feature') {
    if (json.properties?.name) detectedName = json.properties.name;
    coordsArray = json.geometry?.coordinates;
  } else if (json.coordinates) {
    coordsArray = json.coordinates;
  } else if (Array.isArray(json)) {
    coordsArray = json;
  }

  if (!coordsArray || coordsArray.length === 0) {
    throw new Error('GeoJSON geometri koordinatları bulunamadı');
  }

  // Handle MultiPolygon or Nested Polygon array
  while (Array.isArray(coordsArray[0]) && Array.isArray(coordsArray[0][0]) && typeof coordsArray[0][0][0] !== 'number') {
    coordsArray = coordsArray[0];
  }

  if (Array.isArray(coordsArray[0]) && Array.isArray(coordsArray[0][0])) {
    // Polygon exterior ring
    coordsArray = coordsArray[0];
  }

  const coords: ParcelCoordinate[] = [];
  for (const pt of coordsArray) {
    if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
      coords.push({
        lng: Number(pt[0]),
        lat: Number(pt[1]),
        alt: pt[2] ? Number(pt[2]) : 0,
      });
    }
  }

  if (coords.length < 3) {
    throw new Error('Geçerli bir poligon için en az 3 köşe noktası gereklidir');
  }

  // Close ring if needed
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first.lng !== last.lng || first.lat !== last.lat) {
    coords.push({ ...first });
  }

  return {
    id: 'geojson-' + Date.now(),
    name: detectedName,
    city: 'Özel Konum',
    areaM2: calculateArea(coords),
    perimeterM: calculatePerimeter(coords),
    coordinates: coords,
  };
}
