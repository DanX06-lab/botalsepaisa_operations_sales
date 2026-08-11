import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Droplet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        if (!data || !data.token) {
          setError('Backend API unavailable. Please set VITE_API_BASE_URL environment variable on your frontend deployment.');
          return;
        }
        login(data.token, data.username, data.role);
        setLocation('/dashboard');
      },
      onError: (err: any) => {
        setError(err.message || 'Invalid credentials');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/10 rounded-b-[100%] blur-3xl -translate-y-1/2 pointer-events-none"></div>
      
      <Card className="w-full max-w-md shadow-xl border-primary/20 relative z-10">
        <CardHeader className="space-y-4 pb-6 text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Droplet className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">BotalSePaisa</CardTitle>
            <CardDescription className="text-base">
              Operations Portal Login
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base mt-2" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground border-t bg-muted/20 py-4">
          Default: admin / botalsepaisa123
        </CardFooter>
      </Card>
    </div>
  );
}
