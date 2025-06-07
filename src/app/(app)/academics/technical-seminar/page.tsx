
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Presentation, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TechnicalSeminarPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'Student') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Presentation className="w-16 h-16 mb-4" />
        <p>This page is for students to manage their technical seminar submissions.</p>
        <p>If you are a student, please ensure you are logged in correctly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Presentation className="mr-2 h-8 w-8 text-primary" /> My Technical Seminar
        </h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Technical Seminar Submission</CardTitle>
          <CardDescription>
            Submit your technical seminar topic, abstract, report, and presentation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Feature Under Development</AlertTitle>
            <AlertDescription>
              The backend functionality for managing technical seminars is not yet implemented.
              This is a placeholder page for the UI.
            </AlertDescription>
          </Alert>
          {/* Placeholder for form and list */}
          <div className="mt-6 text-center text-muted-foreground">
            <p>Technical seminar submission form and status tracking will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
