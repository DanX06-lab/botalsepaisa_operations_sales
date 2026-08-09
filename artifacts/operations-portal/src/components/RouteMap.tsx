import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
  route: {
    homeLocation: { latitude: number; longitude: number };
    stops: Array<{
      sequence: number;
      shopName: string;
      latitude: number;
      longitude: number;
      status: 'PENDING' | 'VISITED' | 'SKIPPED';
      distanceFromPreviousKm: number;
      estimatedArrivalMinutes: number;
    }>;
  };
}

function MapBounds({ route }: RouteMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!route || !route.stops.length) return;

    const bounds = L.latLngBounds([
      [route.homeLocation.latitude, route.homeLocation.longitude],
      ...route.stops.map(stop => [stop.latitude, stop.longitude] as [number, number])
    ]);

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, route]);

  return null;
}

export default function RouteMap({ route }: RouteMapProps) {
  if (!route || !route.stops.length) {
    return (
      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No route data available</p>
        </div>
      </div>
    );
  }

  const homePosition: [number, number] = [route.homeLocation.latitude, route.homeLocation.longitude];
  const routePath: [number, number][] = [
    homePosition,
    ...route.stops.map(stop => [stop.latitude, stop.longitude] as [number, number]),
    homePosition // Return to home
  ];

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'VISITED':
        return '#22c55e'; // green
      case 'SKIPPED':
        return '#ef4444'; // red
      default:
        return '#3b82f6'; // blue
    }
  };

  const createCustomIcon = (status: string, sequence: number) => {
    const color = getMarkerColor(status);
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${sequence}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createHomeIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #f97316;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          🏠
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  return (
    <div className="aspect-video rounded-md overflow-hidden border">
      <MapContainer
        center={homePosition}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds route={route} />
        
        {/* Route path */}
        <Polyline
          positions={routePath}
          color="#3b82f6"
          weight={4}
          opacity={0.7}
          dashArray="10, 10"
        />
        
        {/* Home marker */}
        <Marker position={homePosition} icon={createHomeIcon()}>
          <Popup>
            <div className="font-medium">Home / Base Location</div>
          </Popup>
        </Marker>
        
        {/* Shop markers */}
        {route.stops.map((stop) => (
          <Marker
            key={stop.sequence}
            position={[stop.latitude, stop.longitude]}
            icon={createCustomIcon(stop.status, stop.sequence)}
          >
            <Popup>
              <div className="space-y-2">
                <div className="font-semibold">{stop.shopName}</div>
                <div className="flex items-center gap-2 text-sm">
                  {stop.status === 'VISITED' && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Visited
                    </span>
                  )}
                  {stop.status === 'SKIPPED' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-3 w-3" />
                      Skipped
                    </span>
                  )}
                  {stop.status === 'PENDING' && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stop.distanceFromPreviousKm.toFixed(1)} km from previous
                </div>
                <div className="text-xs text-muted-foreground">
                  ETA: {stop.estimatedArrivalMinutes} min
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
