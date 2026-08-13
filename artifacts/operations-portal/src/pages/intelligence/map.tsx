import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useListIntelligenceMap, useGetIntelligenceNearby } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [22.5726, 88.3639];
const MIN_ZOOM_TO_FETCH = 11;

// Component to handle map events
function MapEventHandler({
  setBounds,
  setZoom,
  nearbyMode,
  setPinLocation,
}: {
  setBounds: (b: L.LatLngBounds) => void;
  setZoom: (z: number) => void;
  nearbyMode: boolean;
  setPinLocation: (loc: [number, number]) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    },
    click: (e) => {
      if (nearbyMode) {
        setPinLocation([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  useEffect(() => {
    setBounds(map.getBounds());
    setZoom(map.getZoom());
  }, [map, setBounds, setZoom]);

  return null;
}

export default function IntelligenceMap() {
  const { toast } = useToast();
  
  // Map State
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [zoom, setZoom] = useState(12);
  
  // Filters State
  const [businessType, setBusinessType] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  
  // Nearby Mode State
  const [nearbyMode, setNearbyMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [pinLocation, setPinLocation] = useState<[number, number] | null>(null);

  const shouldFetchMap = !nearbyMode && zoom >= MIN_ZOOM_TO_FETCH && bounds !== null;

  // Standard Map Fetching
  const mapParams = useMemo(() => {
    if (!bounds) return {};
    return {
      min_lat: bounds.getSouthWest().lat,
      max_lat: bounds.getNorthEast().lat,
      min_lng: bounds.getSouthWest().lng,
      max_lng: bounds.getNorthEast().lng,
      business_type: businessType !== 'all' ? businessType : undefined,
      rating_min: minRating > 0 ? minRating : undefined,
    };
  }, [bounds, businessType, minRating]);

  const {
    data: mapData,
    isLoading: isLoadingMap,
    isError: isErrorMap
  } = useListIntelligenceMap(mapParams, {
    query: {
      enabled: shouldFetchMap,
      staleTime: 30000,
    }
  });

  // Nearby Fetching
  const nearbyParams = useMemo(() => {
    if (!pinLocation) return {};
    return {
      lat: pinLocation[0],
      lng: pinLocation[1],
      radius_km: radiusKm,
    };
  }, [pinLocation, radiusKm]);

  const {
    data: nearbyData,
    isLoading: isLoadingNearby,
    isError: isErrorNearby
  } = useGetIntelligenceNearby(nearbyParams, {
    query: {
      enabled: nearbyMode && pinLocation !== null,
      staleTime: 30000,
    }
  });

  // Handle Limit Reached Toast
  useEffect(() => {
    if (mapData?.limit_reached) {
      toast({
        title: 'Limit Reached',
        description: `Showing 1000 of ${mapData.total_available} records. Zoom in for more.`,
        duration: 5000,
      });
    }
  }, [mapData?.limit_reached, mapData?.total_available, toast]);

  const markers = nearbyMode ? (nearbyData?.data || []) : (mapData?.data || []);
  const isLoading = nearbyMode ? isLoadingNearby : isLoadingMap;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] -mt-6 -mx-6">
      {/* Sidebar Overlay */}
      <div className="w-full md:w-80 bg-background border-r p-4 flex flex-col gap-6 overflow-y-auto z-10 shrink-0 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold mb-1">Intelligence Map</h2>
          <p className="text-sm text-muted-foreground">Explore Kolkata businesses</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="nearby-mode" className="font-semibold cursor-pointer">Nearby Mode</Label>
            <Switch
              id="nearby-mode"
              checked={nearbyMode}
              onCheckedChange={(checked) => {
                setNearbyMode(checked);
                if (!checked) setPinLocation(null);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {nearbyMode 
              ? "Click on the map to drop a pin and find businesses within a radius."
              : "Pan and zoom to view businesses in the current map view."}
          </p>
        </div>

        {nearbyMode ? (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Radius (km)</Label>
                <span className="text-sm text-muted-foreground">{radiusKm} km</span>
              </div>
              <Slider
                value={[radiusKm]}
                min={1}
                max={50}
                step={1}
                onValueChange={(val) => setRadiusKm(val[0])}
              />
            </div>
            {!pinLocation && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertTitle>Action required</AlertTitle>
                <AlertDescription>Click anywhere on the map to drop a pin.</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CAFE">Cafe</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Minimum Rating</Label>
                <span className="text-sm text-muted-foreground">{minRating}+</span>
              </div>
              <Slider
                value={[minRating]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(val) => setMinRating(val[0])}
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t space-y-2">
          {isLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading data...
            </div>
          )}
          {!isLoading && markers.length > 0 && (
            <div className="text-sm font-medium">
              Showing {markers.length} businesses
              {mapData?.total_available && !nearbyMode && ` out of ${mapData.total_available}`}
            </div>
          )}
          {!nearbyMode && zoom < MIN_ZOOM_TO_FETCH && (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Zoom In</AlertTitle>
               <AlertDescription>Zoom in to see businesses.</AlertDescription>
             </Alert>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEventHandler
            setBounds={setBounds}
            setZoom={setZoom}
            nearbyMode={nearbyMode}
            setPinLocation={setPinLocation}
          />

          {nearbyMode && pinLocation && (
            <Marker position={pinLocation}>
              <Popup>Your selected location</Popup>
            </Marker>
          )}

          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {markers.map((marker) => {
              if (!marker.latitude || !marker.longitude) return null;
              
              return (
                <Marker
                  key={marker.id}
                  position={[marker.latitude, marker.longitude]}
                >
                  <Popup>
                    <div className="p-1 max-w-xs space-y-2">
                      <h3 className="font-bold text-lg leading-tight">{marker.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{marker.business_type?.toLowerCase()}</span>
                        {marker.rating && <span>• ⭐ {marker.rating}</span>}
                      </div>
                      
                      <div className="text-sm space-y-1">
                        {marker.cuisine && marker.cuisine.length > 0 && (
                          <p><strong>Cuisine:</strong> {marker.cuisine.join(', ')}</p>
                        )}
                        {(marker.zone_id || marker.area_id) && (
                          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                            {marker.zone_id && <span>Zone: {marker.zone_id} </span>}
                            {marker.area_id && <span>Area: {marker.area_id}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
