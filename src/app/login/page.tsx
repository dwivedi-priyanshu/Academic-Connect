
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { GraduationCap, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Password currently not used by backend login action
  const [selectedRole, setSelectedRole] = useState<UserRole>('Student');
  const { login, isAuthenticated, isLoading: authIsLoading } = useAuth(); // Renamed isLoading to authIsLoading
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authIsLoading, router]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedRole) { // Password validation removed as it's not used by current backend
      toast({ title: "Error", description: "Please fill in email and select a role.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const success = await login(email, selectedRole);
    setIsSubmitting(false);

    if (!success) {
      toast({ title: "Login Failed", description: "Invalid credentials or user not found for the selected role. Please try again.", variant: "destructive" });
    }
    // Successful login is handled by AuthContext redirect
  };

  if (authIsLoading || (!authIsLoading && isAuthenticated)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <GraduationCap className="h-16 w-16 text-primary animate-pulse" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <GraduationCap size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Academic Connect</CardTitle>
          <CardDescription>Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                placeholder="••••••••" // Password field kept for UI, but not sent/checked
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Login as</Label>
              <RadioGroup
                defaultValue="Student"
                onValueChange={(value: UserRole) => setSelectedRole(value)}
                className="flex space-x-4 pt-1"
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Student" id="role-student" disabled={isSubmitting} />
                  <Label htmlFor="role-student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Faculty" id="role-faculty" disabled={isSubmitting} />
                  <Label htmlFor="role-faculty">Faculty</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Admin" id="role-admin" disabled={isSubmitting} />
                  <Label htmlFor="role-admin">Admin</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || authIsLoading}>
              {isSubmitting ? 'Logging in...' : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p>
            Login with your registered email and role.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

