import { createContext, useContext } from 'react';
import type { Map as MapLibre } from 'maplibre-gl';

export const MapContext = createContext<MapLibre | null>(null);

/** The live map instance; children of <MapView> only render once it has loaded, so it's non-null there. */
export const useMap = () => useContext(MapContext);
