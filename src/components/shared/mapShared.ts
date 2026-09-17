import type { LatLng } from '@/types';

export interface MapPointResult {
  lat: number;
  lng: number;
  label: string;
}

export interface MapPointPickerProps {
  initialPosition?: LatLng;
  title: string;
  confirmLabel?: string;
  onConfirm: (point: MapPointResult) => void;
  onCancel: () => void;
}

export interface PreviewMapPoint extends LatLng {
  label?: string;
  pinColor?: string;
}

export interface PointsPreviewMapProps {
  points: PreviewMapPoint[];
  height?: number;
}

export const COTONOU_CENTER: LatLng = { lat: 6.366, lng: 2.425 };
