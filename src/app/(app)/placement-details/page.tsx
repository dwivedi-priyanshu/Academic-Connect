
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { PlacementDrive, PlacementOffer, OfferStatus } from '@/types';
import { Award, Building, CalendarDays, FileText, Info, Briefcase, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from 'react';
import { fetchStudentPlacementDrivesAction, fetchStudentPlacementOffersAction, updatePlacementOfferStatusAction } from '@/actions/placement-actions';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const StatusBadge = ({ status }: { status: OfferStatus }) => {
  let IconComponent = Clock;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let className = "capitalize";

  switch (status) {
    case 'Accepted':
      IconComponent = CheckCircle;
      className = "bg-success text-success-foreground hover:bg-success/90 capitalize";
      break;
    case 'Rejected':
      IconComponent = XCircle;
      variant = "destructive";
      className = "capitalize";
      break;
    case 'Offered':
      IconComponent = Briefcase;
      variant = "default";
      className = "bg-blue-500 text-white hover:bg-blue-600 capitalize";
      break;
    case 'Pending':
      IconComponent = Clock;
      variant = "outline";
      className = "capitalize";
      break;
    default:
      IconComponent = Info;
  }
  return (
    <Badge variant={variant} className={className}>
      <IconComponent className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
};


export default function PlacementDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [offers, setOffers] = useState<PlacementOffer[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  const loadPlacementData = async () => {
    if (!user) return;
    setIsLoadingDrives(true);
    setIsLoadingOffers(true);
    try {
      const [drivesData, offersData] = await Promise.all([
        fetchStudentPlacementDrivesAction(user.id),
        fetchStudentPlacementOffersAction(user.id)
      ]);
      setDrives(drivesData);
      setOffers(offersData);
    } catch (error) {
      console.error("Failed to load placement data:", error);
      toast({ title: "Error", description: "Could not load placement details.", variant: "destructive" });
    } finally {
      setIsLoadingDrives(false);
      setIsLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Student') {
      loadPlacementData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpdateOffer = async (offerId: string, newStatus: 'Accepted' | 'Rejected') => {
    try {
        const success = await updatePlacementOfferStatusAction(offerId, newStatus);
        if (success) {
            toast({title: "Offer Updated", description: `Your response has been recorded.`, className: "bg-success text-success-foreground"});
            loadPlacementData(); // Refresh data
        } else {
            toast({title: "Update Failed", description: "Could not update offer status.", variant: "destructive"});
        }
    } catch (error) {
        toast({title: "Error", description: "An error occurred while updating the offer.", variant: "destructive"});
    }
  }


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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Award className="mr-2 h-8 w-8 text-primary" /> My Placement Details
        </h1>
      </div>

      {/* Placement Offers Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>My Placement Offers</CardTitle>
          <CardDescription>
            Details of job offers you have received through campus placements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOffers ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={`offer-skel-${i}`} className="h-24 w-full rounded-md" />)}
            </div>
          ) : offers.length > 0 ? (
            <div className="space-y-4">
              {offers.map(offer => (
                <Card key={offer.id} className="bg-muted/30">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div>
                      <CardTitle className="text-xl">{offer.companyName}</CardTitle>
                      <CardDescription>{offer.role} - <span className="font-semibold text-primary">{offer.ctcOffered}</span></CardDescription>
                    </div>
                    <StatusBadge status={offer.status} />
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Offer Date: {offer.offerDate}</p>
                    {offer.remarks && <p className="flex items-start"><Info className="mr-2 h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />Remarks: {offer.remarks}</p>}
                     {offer.offerLetterUrl && (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline">
                            <a href={offer.offerLetterUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-1 h-3 w-3"/> View Offer Letter (Sample)
                            </a>
                        </Button>
                     )}
                  </CardContent>
                  {offer.status === 'Offered' && (
                    <CardContent className="pt-2 flex justify-end gap-2">
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
                                <CheckCircle className="mr-1 h-4 w-4"/> Accept Offer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Accept Offer: {offer.companyName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to accept this offer for the role of {offer.role} with CTC {offer.ctcOffered}? This action may be final.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateOffer(offer.id, 'Accepted')} className="bg-success hover:bg-success/80 text-success-foreground">
                                Yes, Accept Offer
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <XCircle className="mr-1 h-4 w-4"/> Reject Offer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Reject Offer: {offer.companyName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to reject this offer for the role of {offer.role}? Please consider your decision carefully.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateOffer(offer.id, 'Rejected')} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground">
                                Yes, Reject Offer
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Offers Yet</AlertTitle>
              <AlertDescription>
                You currently have no placement offers recorded. Keep an eye on upcoming drives!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Placement Drives Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Campus Placement Drives</CardTitle>
          <CardDescription>
            Information about placement drives you are eligible for or have participated in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDrives ? (
             <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={`drive-skel-${i}`} className="h-20 w-full rounded-md" />)}
            </div>
          ) : drives.length > 0 ? (
            <div className="space-y-4">
              {drives.map(drive => (
                <Card key={drive.id} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center"><Building className="mr-2 h-5 w-5 text-primary" />{drive.companyName}</CardTitle>
                    <CardDescription>{drive.role} - Target CTC: <span className="font-medium">{drive.ctcRange || 'Not Specified'}</span></CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Drive Date: {drive.driveDate}</p>
                    {drive.description && <p className="flex items-start"><FileText className="mr-2 h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />Description: {drive.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Drives Information</AlertTitle>
              <AlertDescription>
                There are currently no placement drives listed that you have participated in or are eligible for.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
