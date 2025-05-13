
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { UserRole } from '@/types';
import { GraduationCap, UserPlus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { registerUserAction } from '@/actions/auth-actions';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Student');
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !selectedRole) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    // Basic email validation (can be more robust)
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
        return;
    }
    // Basic password strength (example: min 6 chars)
    if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
        return;
    }


    setIsSubmitting(true);
    try {
      const result = await registerUserAction({ name, email, passwordPlainText: password, role: selectedRole });
      setIsSubmitting(false);

      if (result?.error) {
        toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
      } else if (result?.user) {
        toast({ 
            title: "Registration Successful", 
            description: "Your account has been created. It will be active after admin approval.", 
            className: "bg-success text-success-foreground",
            duration: 5000,
        });
        router.push('/login');
      } else {
        toast({ title: "Registration Failed", description: "An unknown error occurred.", variant: "destructive" });
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Registration error:", error);
      toast({ title: "Registration Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <GraduationCap size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Join Academic Connect</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label>Register as</Label>
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
                {/* Admin registration typically handled differently, e.g. seeding or internal tools */}
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : <><UserPlus className="mr-2 h-4 w-4" /> Register</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <Link href="/login" passHref>
            <Button variant="link" className="text-primary hover:underline p-0 h-auto">
              <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
