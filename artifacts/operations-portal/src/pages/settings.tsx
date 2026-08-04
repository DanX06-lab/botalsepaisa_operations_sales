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
import { Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetSettings();
  
  const [pricePerKg, setPricePerKg] = useState<string>('');

  useEffect(() => {
    if (data?.pricePerKg) {
      setPricePerKg(data.pricePerKg.toString());
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(pricePerKg);
    if (isNaN(num) || num <= 0) {
      toast({ title: "Invalid", description: "Price must be a positive number.", variant: "destructive" });
      return;
    }
    
    updateSettings.mutate({
      data: { pricePerKg: num }
    });
  };

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
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Pricing Configuration</CardTitle>
                  <CardDescription>Set the default payout rate for plastic collections.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} id="settings-form" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerKg">Price Per KG (₹)</Label>
                  <div className="relative max-w-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                      ₹
                    </div>
                    <Input 
                      id="pricePerKg" 
                      type="number" 
                      min="0.1" 
                      step="0.1" 
                      required 
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(e.target.value)}
                      disabled={isLoading}
                      className="pl-8 bg-background max-w-sm text-lg font-medium"
                    />
                  </div>
                </div>

                <Alert className="max-w-sm bg-muted/50 border-muted">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    Only future entries will use the new rate. Past entries remain unaffected.
                  </AlertDescription>
                </Alert>
              </form>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <Button 
                type="submit" 
                form="settings-form"
                disabled={isLoading || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
