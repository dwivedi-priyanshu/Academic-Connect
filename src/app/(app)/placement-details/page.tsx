
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Award, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PlacementDetailsPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'Student') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Award className="w-16 h-16 mb-4" />
        <p>This page is for students to view their placement details.</p>
        <p>If you are a student, please ensure you are logged in correctly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Award className="mr-2 h-8 w-8 text-primary" /> My Placement Details
        </h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Placement Information</CardTitle>
          <CardDescription>
            Details about your campus placement drives, offers, and status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Feature Under Development</AlertTitle>
            <AlertDescription>
              The functionality for managing and displaying placement details is not yet implemented.
              This is a placeholder page for the UI.
            </AlertDescription>
          </Alert>
          {/* Placeholder for placement data */}
          <div className="mt-6 text-center text-muted-foreground">
            <p>Information about placement drives you've participated in, offers received, and company details will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
