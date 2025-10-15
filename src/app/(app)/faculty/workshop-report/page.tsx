
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Workflow, Download, ShieldCheck, Calendar, BookCopy, Users, User, Hash, FileText, Link as LinkIcon, Camera, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DEPARTMENTS } from '@/lib/subjects';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FileUploadInput } from '@/components/core/FileUploadInput';

const formSchema = z.object({
  academicYear: z.string().min(1, 'Academic Year is required'),
  department: z.string().min(1, 'Department is required'),
  preparedBy: z.string().min(1, 'Prepared By is required'),
  workshopTitle: z.string().min(1, 'Workshop title is required'),
  resourcePerson: z.string().min(1, 'Resource person details are required'),
  date: z.string().min(1, 'Date is required'),
  semesterSection: z.string().min(1, 'Semester / Section is required'),
  participantCount: z.string().min(1, 'Number of participants is required'),
  topicsCovered: z.string().min(1, 'Topics covered are required'),
  outcome: z.string().min(1, 'Outcome is required'),
  posAddressed: z.string().optional(),
  psosAddressed: z.string().optional(),
  feedbackLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  photos: z.any().optional(),
});

type WorkshopForm = z.infer<typeof formSchema>;

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function WorkshopReportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<WorkshopForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`,
      preparedBy: user?.name || '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const [workshopPhotos, setWorkshopPhotos] = useState<FileList | null>(null);

  const generatePDF = async (data: WorkshopForm) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Workshop Report', 105, 20, { align: 'center' });

    const tableData = Object.entries(data)
      .filter(([key]) => key !== 'photos')
      .map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return [label, value || 'N/A'];
      });

    (doc as any).autoTable({
        startY: 30,
        head: [['Field', 'Details']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 120 } }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY || 10;

    const addImagesToPDF = async (files: FileList | null, title: string) => {
        if (files && files.length > 0) {
            if (finalY > 240) { doc.addPage(); finalY = 15; } else { finalY += 15; }
            doc.setFontSize(14);
            doc.text(title, 14, finalY);
            finalY += 10;

            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    const dataUrl = await readFileAsDataURL(file);
                    
                    const imgProps = doc.getImageProperties(dataUrl);
                    const imgWidth = 85; // Half page width for side-by-side
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                    
                    const xPos = (i % 2 === 0) ? 15 : 110;

                    if (finalY + imgHeight > 280) {
                        doc.addPage();
                        finalY = 15;
                    }
                    
                    doc.addImage(dataUrl, 'JPEG', xPos, finalY, imgWidth, imgHeight);
                    
                    if (i % 2 !== 0) {
                        finalY += imgHeight + 10;
                    }
                } catch (e) {
                    console.error("Error adding image to PDF:", e);
                }
            }
        }
    };
    
    await addImagesToPDF(workshopPhotos, "Workshop Photos / Screenshots");

    doc.save(`Workshop_Report_${data.workshopTitle.replace(/\s/g, '_')}_${data.date}.pdf`);
    toast({ title: "PDF Generated", description: "Your report has been downloaded.", className: "bg-success text-success-foreground" });
  };


  if (!user || user.role !== 'Faculty') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <ShieldCheck className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is for faculty members only.</p>
      </div>
    );
  }

  const renderField = (name: keyof WorkshopForm, label: string, icon: React.ReactNode, placeholder: string, type: 'input' | 'textarea' | 'select' = 'input', options?: string[]) => (
    <div className="space-y-1">
      <Label htmlFor={name} className="flex items-center text-muted-foreground"><span className="mr-2">{icon}</span> {label}</Label>
      {type === 'select' ? (
        <Controller
          name={name as any}
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id={name} className="bg-background"><SelectValue placeholder={placeholder} /></SelectTrigger>
              <SelectContent>
                {options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      ) : type === 'textarea' ? (
        <Textarea id={name} placeholder={placeholder} {...register(name)} className="bg-background" />
      ) : (
        <Input id={name} type={name.includes('date') ? 'date' : name.includes('Count') ? 'number' : 'text'} placeholder={placeholder} {...register(name)} className="bg-background" />
      )}
      {errors[name] && <p className="text-sm text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Workflow className="mr-2 h-8 w-8 text-primary" /> Workshop Report</h1>
        <Button onClick={handleSubmit(generatePDF)}>
          <Download className="mr-2 h-4 w-4" /> Download as PDF
        </Button>
      </div>

      <form>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Workshop Details</CardTitle>
            <CardDescription>Fill out the form to generate a report for a conducted workshop. All fields will be included in the PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderField('academicYear', 'Academic Year', <Calendar />, 'e.g., 2023-24')}
              {renderField('department', 'Department', <Users />, 'e.g., Computer Science', 'select', DEPARTMENTS)}
              {renderField('preparedBy', 'Prepared By', <User />, 'Faculty Name')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('workshopTitle', 'Title of the Workshop', <FileText />, 'Enter workshop title')}
              {renderField('resourcePerson', 'Resource Person(s) & Designation', <User />, 'e.g., Dr. Jane Doe, CEO of TechCorp', 'textarea')}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-6">
              {renderField('date', 'Date of Workshop', <Calendar />, 'Workshop Date')}
              {renderField('semesterSection', 'Audience (Semester / Section)', <Users />, 'e.g., 5 A, 5 B')}
              {renderField('participantCount', 'Number of Participants', <Users />, 'e.g., 120')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('topicsCovered', 'Topics Covered', <BookCopy />, 'Enter topics covered in the workshop', 'textarea')}
              {renderField('outcome', 'Outcome of the Workshop', <Hash />, 'What was the outcome?', 'textarea')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('posAddressed', 'POs Addressed', <Hash />, 'e.g., PO1, PO2, PO9')}
              {renderField('psosAddressed', 'PSOs Addressed', <Hash />, 'e.g., PSO1, PSO2')}
            </div>
            
            <div className="grid grid-cols-1 gap-4 border-t pt-6">
                 {renderField('feedbackLink', 'Attendance / Feedback Link', <LinkIcon />, 'http://...')}
            </div>

            <div className="border-t pt-6">
                <Label htmlFor="photos" className="flex items-center text-muted-foreground mb-1"><span className="mr-2"><ImageIcon /></span> Workshop Photos / Screenshots</Label>
                <FileUploadInput 
                    id="photos" 
                    label=""
                    onFileChange={(files) => setWorkshopPhotos(files as any)}
                    accept="image/*"
                    multiple
                />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
