'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { promoteStudentsAction } from '@/actions/admin-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEPARTMENTS } from '@/lib/subjects';

const YEARS = ["1", "2", "3", "4"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function PromoteStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCurrentSemester, setSelectedCurrentSemester] = useState<string>('');
  const [selectedNextSemester, setSelectedNextSemester] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<{ success: boolean; promotedCount: number; message: string } | null>(null);

  const handlePromote = async () => {
    if (!selectedDepartment || !selectedYear || !selectedCurrentSemester || !selectedNextSemester) {
      toast({ 
        title: "Missing Information", 
        description: "Please select all fields: Department, Year, Current Semester, and Next Semester.", 
        variant: "destructive" 
      });
      return;
    }

    if (parseInt(selectedNextSemester) <= parseInt(selectedCurrentSemester)) {
      toast({ 
        title: "Invalid Selection", 
        description: "Next semester must be greater than current semester.", 
        variant: "destructive" 
      });
      return;
    }

    setIsPromoting(true);
    setPromotionResult(null);
    
    try {
      const result = await promoteStudentsAction(
        selectedDepartment,
        parseInt(selectedYear),
        parseInt(selectedCurrentSemester),
        parseInt(selectedNextSemester)
      );

      setPromotionResult(result);

      if (result.success) {
        toast({ 
          title: "Promotion Successful", 
          description: result.message, 
          className: "bg-success text-success-foreground" 
        });
        // Reset form after successful promotion
        setSelectedDepartment('');
        setSelectedYear('');
        setSelectedCurrentSemester('');
        setSelectedNextSemester('');
      } else {
        toast({ 
          title: "Promotion Failed", 
          description: result.message, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: (error as Error).message || "An unexpected error occurred.", 
        variant: "destructive" 
      });
      setPromotionResult({
        success: false,
        promotedCount: 0,
        message: (error as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  if (!user || user.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <GraduationCap className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is for administrators only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center">
        <GraduationCap className="mr-2 h-8 w-8 text-primary" /> Promote Students
      </h1>

      <Alert>
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          This feature will update the <strong>currentSemester</strong> field for selected students. 
          <strong> All marks (regular and TYL) are preserved permanently</strong> and will not be affected by promotion. 
          Marks are stored semester-wise and subject-wise, so historical data remains intact.
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Students to Promote</CardTitle>
          <CardDescription>
            Choose the department, batch/year, current semester, and target semester. 
            All students matching these criteria will be promoted to the next semester.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Year/Batch <span className="text-destructive">*</span></Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} required disabled={!selectedDepartment}>
                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => <SelectItem key={year} value={year}>Year {year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Current Semester <span className="text-destructive">*</span></Label>
              <Select value={selectedCurrentSemester} onValueChange={setSelectedCurrentSemester} required disabled={!selectedYear}>
                <SelectTrigger><SelectValue placeholder="Current Semester" /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Next Semester <span className="text-destructive">*</span></Label>
              <Select 
                value={selectedNextSemester} 
                onValueChange={setSelectedNextSemester} 
                required 
                disabled={!selectedCurrentSemester}
              >
                <SelectTrigger><SelectValue placeholder="Next Semester" /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.filter(sem => !selectedCurrentSemester || parseInt(sem) > parseInt(selectedCurrentSemester))
                    .map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handlePromote} 
              disabled={isPromoting || !selectedDepartment || !selectedYear || !selectedCurrentSemester || !selectedNextSemester}
              size="lg"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              {isPromoting ? 'Promoting...' : 'Promote Students'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {promotionResult && (
        <Card className={`shadow-lg ${promotionResult.success ? 'border-green-500' : 'border-red-500'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {promotionResult.success ? (
                <><CheckCircle2 className="h-5 w-5 text-green-600" /> Promotion Successful</>
              ) : (
                <><AlertCircle className="h-5 w-5 text-red-600" /> Promotion Failed</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{promotionResult.message}</p>
            {promotionResult.success && (
              <p className="text-sm font-semibold text-green-600">
                {promotionResult.promotedCount} student(s) promoted successfully. All marks have been preserved.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

