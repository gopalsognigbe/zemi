export interface PopularPlace {
  name: string;
  lat: number;
  lng: number;
}

/** Lieux fréquents autour de Cotonou pour un choix rapide de destination. */
export const POPULAR_PLACES: PopularPlace[] = [
  { name: 'Cotonou Centre (Ganhi)', lat: 6.366, lng: 2.425 },
  { name: 'Marché Dantokpa', lat: 6.373, lng: 2.435 },
  { name: 'Fidjrossè', lat: 6.360, lng: 2.380 },
  { name: 'Akpakpa', lat: 6.363, lng: 2.445 },
  { name: 'Abomey-Calavi', lat: 6.449, lng: 2.356 },
  { name: 'Cadjèhoun', lat: 6.357, lng: 2.384 },
];
