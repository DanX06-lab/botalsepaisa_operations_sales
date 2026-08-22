import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useGetSettings, 
  useUpdateSettings,
  getGetSettingsQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Settings as SettingsIcon, AlertCircle, MapPin, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetSettings();
  
  const [homeLatitude, setHomeLatitude] = useState<string>('');
  const [homeLongitude, setHomeLongitude] = useState<string>('');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  useEffect(() => {
    if (data?.homeLatitude) {
      setHomeLatitude(data.homeLatitude.toString());
    }
    if (data?.homeLongitude) {
      setHomeLongitude(data.homeLongitude.toString());
    }
  }, [data]);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Settings updated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }

    setIsCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLatitude(position.coords.latitude.toFixed(6));
        setHomeLongitude(position.coords.longitude.toFixed(6));
        setIsCapturingLocation(false);
        toast({ title: "Success", description: "Location captured successfully" });
      },
      (error) => {
        setIsCapturingLocation(false);
        let errorMessage = "Failed to capture location";
        if (error.code === 1) {
          errorMessage = "Location permission denied. Please enable location access.";
        } else if (error.code === 2) {
          errorMessage = "Location unavailable. Please check your device settings.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again.";
        }
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(homeLatitude);
    const lng = parseFloat(homeLongitude);

    updateSettings.mutate({
      data: { 
        homeLatitude: (!isNaN(lat) && lat >= -90 && lat <= 90) ? lat : null,
        homeLongitude: (!isNaN(lng) && lng >= -180 && lng <= 180) ? lng : null
      }
    });
  };

  const hasHomeLocation = data?.homeLatitude && data?.homeLongitude;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure global application settings.</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Collection Base / Home Location</CardTitle>
                  <CardDescription>Set your home/base location for route planning.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} id="location-form" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCaptureLocation}
                      disabled={isCapturingLocation}
                      className="flex-1"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isCapturingLocation ? 'Capturing...' : 'Capture Current Location'}
                    </Button>
                    {hasHomeLocation && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Location saved</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="homeLatitude">Latitude</Label>
                      <Input 
                        id="homeLatitude" 
                        type="number" 
                        step="any"
                        placeholder="e.g., 28.6139"
                        value={homeLatitude}
                        onChange={(e) => setHomeLatitude(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homeLongitude">Longitude</Label>
                      <Input 
                        id="homeLongitude" 
                        type="number" 
                        step="any"
                        placeholder="e.g., 77.2090"
                        value={homeLongitude}
                        onChange={(e) => setHomeLongitude(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Alert className="bg-muted/50 border-muted">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm text-muted-foreground">
                      Home location is used as the start and end point for route planning. Capture your current location or enter coordinates manually.
                    </AlertDescription>
                  </Alert>
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <Button 
                type="submit" 
                form="location-form"
                disabled={isLoading || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Location'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
