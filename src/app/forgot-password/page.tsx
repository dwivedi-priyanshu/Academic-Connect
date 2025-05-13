
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    // Simulate API call for password reset
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    toast({ 
        title: "Password Reset Requested", 
        description: `If an account exists for ${email}, a password reset link has been sent. (This is a demo - no email is actually sent.)`,
        className: "bg-success text-success-foreground",
        duration: 7000,
    });
    setEmail('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <GraduationCap size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>}
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
