import { ParcelInfo } from '../types';
import { calculateArea, calculatePerimeter } from '../utils/geoUtils';

const rawDefaultCoords = [
  { lng: 28.9810, lat: 40.2240 },
  { lng: 28.9825, lat: 40.2245 },
  { lng: 28.9830, lat: 40.2230 },
  { lng: 28.9812, lat: 40.2228 },
  { lng: 28.9810, lat: 40.2240 },
];

export const DEFAULT_PARCEL: ParcelInfo = {
  id: 'custom-parcel',
  name: 'Parsel Tanıtımı',
  city: 'Bursa',
  district: 'Nilüfer',
  neighborhood: 'Özlüce',
  adaNo: '2412',
  parselNo: '8',
  price: '18.500.000 ₺',
  description: 'Ana artere cepheli, emsal 1.50 konut+ticari imarlı köşe parsel.',
  coordinates: rawDefaultCoords,
  areaM2: calculateArea(rawDefaultCoords),
  perimeterM: calculatePerimeter(rawDefaultCoords),
};

export const DEMO_PARCELS: ParcelInfo[] = [DEFAULT_PARCEL];

