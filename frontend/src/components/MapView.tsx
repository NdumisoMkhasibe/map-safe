import { useEffect, useRef, useState } from 'react';
import { AttributionControl, GeoJSONSource, Map as LibreMap, Marker } from 'maplibre-gl';
import { Compass, LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { currentLocation, scoreColor } from '../domain';
import { errorMessage } from '../api';
import type { Area, Position, SearchResult } from '../types';

export type MapViewProps = {
  areas: Area[];
  drawing: boolean;
  corners: Position[];
  onCorners: (corners: Position[]) => void;
  onViewport: (bbox: string) => void;
  onPoint: (point: Position) => void;
  focus: SearchResult | Area | null;
};

/** MapLibre handles rendering only; domain data and selection stay in React and the API. */
export default function MapView(props: MapViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!host.current) return;
    let instance: LibreMap;
    let timeout: ReturnType<typeof setTimeout>;
    setFailed(false);
    setReady(false);
    try {
      instance = new LibreMap({
        container: host.current,
        style:
          import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron',
        center: [
          Number(import.meta.env.VITE_INITIAL_LONGITUDE || 28.0473),
          Number(import.meta.env.VITE_INITIAL_LATITUDE || -26.2041),
        ],
        zoom: 12.3,
        attributionControl: false,
        maxZoom: 19,
      });
      map.current = instance;
      instance.addControl(
        new AttributionControl({
          compact: true,
          customAttribution:
            import.meta.env.VITE_MAP_ATTRIBUTION ||
            '© <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
        }),
        'bottom-right',
      );
      timeout = setTimeout(() => setFailed(true), 20_000);
      instance.on('load', () => {
        clearTimeout(timeout);
        instance.addSource('areas', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        instance.addLayer({
          id: 'area-fill',
          type: 'fill',
          source: 'areas',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 },
        });
        instance.addLayer({
          id: 'area-outline',
          type: 'line',
          source: 'areas',
          paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
        });
        instance.addSource('labels', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        instance.addLayer({
          id: 'area-label',
          type: 'symbol',
          source: 'labels',
          layout: { 'text-field': ['get', 'label'], 'text-size': 13 },
          paint: { 'text-color': '#143a38', 'text-halo-color': '#ffffff', 'text-halo-width': 3 },
        });
        instance.addSource('draft', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        instance.addLayer({
          id: 'draft-fill',
          type: 'fill',
          source: 'draft',
          filter: ['==', '$type', 'Polygon'],
          paint: { 'fill-color': '#0e746a', 'fill-opacity': 0.2 },
        });
        instance.addLayer({
          id: 'draft-outline',
          type: 'line',
          source: 'draft',
          paint: { 'line-color': '#0e746a', 'line-width': 3, 'line-dasharray': [2, 2] },
        });
        setReady(true);
        setFailed(false);
        viewport();
      });
      const viewport = () => {
        const bounds = instance.getBounds();
        latest.current.onViewport(
          [
            Math.max(-180, bounds.getWest()),
            Math.max(-90, bounds.getSouth()),
            Math.min(180, bounds.getEast()),
            Math.min(90, bounds.getNorth()),
          ].join(','),
        );
      };
      instance.on('moveend', viewport);
      instance.on('click', (event) => {
        const current = latest.current;
        if (current.drawing) {
          if (current.corners.length < 4)
            current.onCorners([...current.corners, [event.lngLat.lng, event.lngLat.lat]]);
        } else current.onPoint([event.lngLat.lng, event.lngLat.lat]);
      });
      instance.on('error', () => {
        if (!instance.isStyleLoaded()) setFailed(true);
      });
    } catch {
      setFailed(true);
      return;
    }
    return () => {
      clearTimeout(timeout);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource('areas') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: props.areas.map((area) => ({
        type: 'Feature',
        id: area.id,
        properties: { color: scoreColor(area.score) },
        geometry: area.geometry,
      })),
    });
    (map.current.getSource('labels') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: props.areas.map((area) => ({
        type: 'Feature',
        properties: {
          label: `${area.score === null ? '—' : area.score.toFixed(1)} / 10 · ${area.name || 'Community area'}`,
        },
        geometry: { type: 'Point', coordinates: [area.centroidLongitude, area.centroidLatitude] },
      })),
    });
  }, [ready, props.areas]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    instance.getCanvas().style.cursor = props.drawing ? 'crosshair' : '';
    const corners = props.drawing ? props.corners : [];
    (instance.getSource('draft') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features:
        corners.length > 1
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry:
                  corners.length === 4
                    ? { type: 'Polygon', coordinates: [[...corners, corners[0]!]] }
                    : { type: 'LineString', coordinates: corners },
              },
            ]
          : [],
    });
    markers.current = corners.map((position, index) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'corner-marker';
      element.textContent = String(index + 1);
      element.setAttribute(
        'aria-label',
        `Corner ${index + 1}. Drag to adjust, or use coordinate fields.`,
      );
      element.addEventListener('click', (event) => event.stopPropagation());
      const marker = new Marker({ element, draggable: true }).setLngLat(position).addTo(instance);
      marker.on('dragend', () => {
        const point = marker.getLngLat();
        latest.current.onCorners(
          latest.current.corners.map((value, i) => (i === index ? [point.lng, point.lat] : value)),
        );
      });
      return marker;
    });
  }, [ready, props.corners, props.drawing]);

  useEffect(() => {
    if (!props.focus || !map.current || !ready) return;
    const focus = props.focus;
    map.current.flyTo({
      center:
        'geometry' in focus
          ? [focus.centroidLongitude, focus.centroidLatitude]
          : [focus.longitude, focus.latitude],
      zoom: 15,
      essential: false,
    });
  }, [props.focus, ready]);

  const locate = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const location = await currentLocation();
      map.current?.flyTo({
        center: [location.coords.longitude, location.coords.latitude],
        zoom: 15,
      });
    } catch (error) {
      setLocationError(errorMessage(error));
    } finally {
      setLocating(false);
    }
  };
  return (
    <div className={`map-wrap ${props.drawing ? 'is-drawing' : ''}`}>
      <div
        ref={host}
        className="map-canvas"
        aria-label="Interactive community safety map"
        role="region"
      />
      {!ready && !failed && (
        <div className="map-message" role="status">
          <span className="spinner" /> Bringing the neighbourhood into view…
        </div>
      )}
      {failed && (
        <div className="map-message map-failed" role="status">
          <Compass size={25} />
          <strong>The map is taking a little longer</strong>
          <p>
            The map provider is unavailable. Community reports and coordinate entry are still
            available.
          </p>
          <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}>
            <RotateCcw size={16} /> Retry map
          </button>
        </div>
      )}
      <div className="map-controls">
        <button className="icon-button" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={21} />
        </button>
        <button
          className="icon-button"
          aria-label="Zoom out"
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={21} />
        </button>
        <span />
        <button
          className="icon-button"
          aria-label="Find my location"
          disabled={locating}
          onClick={() => void locate()}
        >
          <LocateFixed size={21} />
        </button>
      </div>
      {locationError && (
        <div className="map-location-error" role="alert">
          {locationError}
          <button aria-label="Dismiss location error" onClick={() => setLocationError('')}>
            ×
          </button>
        </div>
      )}
      <div className="map-provider">
        Map by {import.meta.env.VITE_MAP_PROVIDER_NAME || 'OpenFreeMap'}
      </div>
    </div>
  );
}
