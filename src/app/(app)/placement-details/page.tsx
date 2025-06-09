
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { PlacementEntry } from '@/types';
import { Award, Building, UploadCloud, PlusCircle, Edit2, Trash2, Download, DollarSign, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchStudentPlacementsAction, saveStudentPlacementAction, deleteStudentPlacementAction } from '@/actions/placement-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const initialPlacementState: Omit<PlacementEntry, '_id' | 'submittedDate' | 'offerLetterUrl'> & {id?: string, offerLetterUrl?: string | undefined} = {
  studentId: '', companyName: '', ctcOffered: '', offerLetterUrl: undefined
};

export default function PlacementDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<PlacementEntry[]>([]);
  const [currentPlacement, setCurrentPlacement] = useState<Omit<PlacementEntry, '_id' | 'submittedDate' | 'offerLetterUrl'> & {id?: string; offerLetterUrl?: string | undefined}>(initialPlacementState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);

  const loadPlacements = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await fetchStudentPlacementsAction(user.id);
      setPlacements(data);
    } catch (error) {
      console.error("Failed to load placement data:", error);
      toast({ title: "Error", description: "Could not load your placement entries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Student') {
      loadPlacements();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentPlacement(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPlacement.companyName || !currentPlacement.ctcOffered) {
        toast({ title: "Missing Information", description: "Company Name and CTC Offered are required.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('id', currentPlacement.id || 'new');
    formData.append('companyName', currentPlacement.companyName);
    formData.append('ctcOffered', currentPlacement.ctcOffered);
    if (currentPlacement.offerLetterUrl) {
        formData.append('existingOfferLetterUrl', currentPlacement.offerLetterUrl);
    }
    if (offerLetterFile) {
      formData.append('offerLetterFile', offerLetterFile);
    }

    try {
      const savedPlacement = await saveStudentPlacementAction(formData, user.id);
      
      const isNew = !currentPlacement.id || currentPlacement.id === 'new';
      setPlacements(prev => {
        if (isNew) {
            return [savedPlacement, ...prev]; // Add new to top
        }
        return prev.map(p => p.id === savedPlacement.id ? savedPlacement : p);
      });

      toast({ title: isNew ? "Placement Entry Added" : "Placement Entry Updated", description: `Details for ${savedPlacement.companyName} have been ${isNew ? 'added' : 'updated'}.`, className: "bg-success text-success-foreground" });

      setCurrentPlacement({ ...initialPlacementState, studentId: user.id });
      setOfferLetterFile(null);
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error submitting placement:", error);
      toast({ title: "Submission Error", description: (error as Error).message || "Could not submit placement entry.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (placement: PlacementEntry) => {
    setCurrentPlacement({ ...placement });
    setOfferLetterFile(null);
    setIsFormVisible(true);
  };

  const handleDelete = async (placement: PlacementEntry) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete the placement entry for ${placement.companyName}? This action cannot be undone.`)) return;

    setIsSubmitting(true); // Use isSubmitting to disable buttons during delete
    try {
      await deleteStudentPlacementAction(placement.id, user.id);
      setPlacements(prev => prev.filter(p => p.id !== placement.id));
      toast({ title: "Placement Entry Deleted", description: `The entry for ${placement.companyName} has been deleted.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting placement:", error);
      toast({ title: "Deletion Error", description: (error as Error).message || "Could not delete placement entry.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible && user) {
      setCurrentPlacement({ ...initialPlacementState, studentId: user.id });
      setOfferLetterFile(null);
    }
  };

  if (!user || user.role !== 'Student') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Award className="w-16 h-16 mb-4" />
        <p>This page is for students to manage their placement details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Award className="mr-2 h-8 w-8 text-primary" /> My Placements
        </h1>
        <Button onClick={toggleFormVisibility} disabled={isLoading || isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> {isFormVisible ? 'Close Form' : 'Add Placement'}
        </Button>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{currentPlacement.id && currentPlacement.id !== 'new' ? 'Edit Placement Entry' : 'Add New Placement Entry'}</CardTitle>
            <CardDescription>
              Enter the company name, CTC offered, and optionally upload the offer letter (PDF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" name="companyName" value={currentPlacement.companyName} onChange={handleInputChange} required className="bg-background" disabled={isSubmitting}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ctcOffered">CTC Offered (e.g., 12 LPA, 60k/month)</Label>
                  <Input id="ctcOffered" name="ctcOffered" value={currentPlacement.ctcOffered} onChange={handleInputChange} required className="bg-background" disabled={isSubmitting}/>
                </div>
              </div>
              <FileUploadInput
                id="offerLetterFile"
                label="Upload Offer Letter (PDF)"
                onFileChange={setOfferLetterFile}
                accept=".pdf"
                currentFile={currentPlacement.offerLetterUrl}
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                <UploadCloud className="mr-2 h-4 w-4" /> {isSubmitting ? 'Processing...' : (currentPlacement.id && currentPlacement.id !== 'new' ? 'Update Entry' : 'Add Entry')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>My Placement Records</CardTitle>
          <CardDescription>List of your recorded placements.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={`placement-skel-${i}`} className="h-28 w-full rounded-md" />)}
            </div>
          ) : placements.length > 0 ? (
            <div className="space-y-4">
              {placements.map(placement => (
                <Card key={placement.id} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl flex items-center"><Building className="mr-2 h-5 w-5 text-primary"/>{placement.companyName}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(placement)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                    <CardDescription className="flex items-center"><DollarSign className="mr-1 h-4 w-4 text-green-600"/>CTC: {placement.ctcOffered}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                     <p className="flex items-center text-xs text-muted-foreground"><CalendarDays className="mr-2 h-3 w-3" />Added: {format(new Date(placement.submittedDate), "PPP")}</p>
                    {placement.offerLetterUrl ? (
                      <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline">
                        <a href={placement.offerLetterUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-3 w-3"/> View Offer Letter
                        </a>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No offer letter uploaded.</p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end pt-2 pb-3 px-6">
                     <Button variant="outline" size="sm" onClick={() => handleEdit(placement)} disabled={isSubmitting}>
                        <Edit2 className="mr-1 h-3 w-3" /> Edit / Upload Letter
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              You have not added any placement entries yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
