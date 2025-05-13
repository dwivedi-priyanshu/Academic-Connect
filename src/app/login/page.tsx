
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { GraduationCap, LogIn, UserPlus, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [selectedRole, setSelectedRole] = useState<UserRole>('Student');
  const { login, isAuthenticated, isLoading: authIsLoading } = useAuth();
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
    if (!email || !password || !selectedRole) { 
      toast({ title: "Error", description: "Please fill in all fields and select a role.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const loginResult = await login(email, password, selectedRole); // Pass password to login function
    setIsSubmitting(false);

    if (typeof loginResult === 'object' && loginResult?.error) {
      toast({ title: "Login Failed", description: loginResult.error, variant: "destructive" });
    } else if (!loginResult) {
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
                placeholder="••••••••" 
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
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <Link href="/forgot-password" passHref>
            <Button variant="link" className="text-muted-foreground hover:text-primary p-0 h-auto">
              <LockKeyhole className="mr-1 h-3 w-3" /> Forgot Password?
            </Button>
          </Link>
           <div className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" passHref>
                 <Button variant="link" className="text-primary hover:underline p-0 h-auto inline">
                    Register here <UserPlus className="ml-1 h-3 w-3 inline"/>
                </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
