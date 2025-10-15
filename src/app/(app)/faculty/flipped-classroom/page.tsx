
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Video, Download, ShieldCheck, Calendar, BookCopy, Users, User, Hash, FileText, Link as LinkIcon, Check, Star, MessageSquare, Image as ImageIcon, Camera } from 'lucide-react';
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
  subjectCode: z.string().min(1, 'Subject Code is required'),
  courseName: z.string().min(1, 'Course Name is required'),
  semesterSection: z.string().min(1, 'Semester / Section is required'),
  preparedBy: z.string().min(1, 'Prepared By is required'),
  curriculumGap: z.string().optional(),
  topic: z.string().min(1, 'Topic is required'),
  date: z.string().min(1, 'Date is required'),
  sessionType: z.enum(['Flipped Class', 'Video Session']),
  totalStudents: z.string().min(1, 'Total number of students is required'),
  flippedClassType: z.string().optional(),
  materialsShared: z.string().optional(),
  proofLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  conduction: z.string().optional(),
  evaluation: z.string().optional(),
  outcome: z.string().optional(),
  posAddressed: z.string().optional(),
  psosAddressed: z.string().optional(),
  remarks: z.string().optional(),
  facultyPhoto: z.any().optional(),
  supportingImages: z.any().optional(),
});

type FlippedClassForm = z.infer<typeof formSchema>;

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function FlippedClassroomPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FlippedClassForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`,
      preparedBy: user?.name || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      sessionType: 'Flipped Class',
    },
  });

  const [facultyPhotos, setFacultyPhotos] = useState<FileList | null>(null);
  const [supportingImages, setSupportingImages] = useState<FileList | null>(null);

  const watchSessionType = watch("sessionType");

  const generatePDF = async (data: FlippedClassForm) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Flipped Classroom / Video Session Report', 105, 20, { align: 'center' });

    // Using autoTable for a structured layout
    const tableData = Object.entries(data)
      .filter(([key]) => !['facultyPhoto', 'supportingImages'].includes(key)) // Exclude file inputs from table
      .map(([key, value]) => {
        // Create a more readable label from the camelCase key
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return [label, value || 'N/A'];
      });

    (doc as any).autoTable({
        startY: 30,
        head: [['Field', 'Details']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Blue header
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 120 } }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY || 10;
    if (finalY > 260) { doc.addPage(); finalY = 15; } else { finalY += 15; }

    const addImagesToPDF = async (files: FileList | null, title: string) => {
        if (files && files.length > 0) {
            doc.setFontSize(14);
            doc.text(title, 14, finalY);
            finalY += 10;

            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    const dataUrl = await readFileAsDataURL(file);
                    
                    const imgProps = doc.getImageProperties(dataUrl);
                    const imgWidth = 180; // Max width for image
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                    if (finalY + imgHeight > 280) { // Check if there's space for the image
                        doc.addPage();
                        finalY = 15; // Reset Y position on new page
                    }
                    doc.addImage(dataUrl, 'JPEG', 15, finalY, imgWidth, imgHeight);
                    finalY += imgHeight + 10;

                } catch (e) {
                    console.error("Error adding image to PDF:", e);
                }
            }
        }
    };
    
    await addImagesToPDF(facultyPhotos, "Faculty Photo(s) / Signature(s)");
    await addImagesToPDF(supportingImages, "Supporting Image(s)");


    doc.save(`Flipped_Class_Report_${data.topic.replace(/\s/g, '_')}_${data.date}.pdf`);
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

  const renderField = (name: keyof FlippedClassForm, label: string, icon: React.ReactNode, placeholder: string, type: 'input' | 'textarea' | 'select' | 'file' = 'input', options?: string[]) => (
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
      ) : type === 'file' ? (
          <FileUploadInput 
            id={name} 
            label=""
            onFileChange={(files) => name === 'facultyPhoto' ? setFacultyPhotos(files as any) : setSupportingImages(files as any)}
            accept="image/*"
            multiple={true} // Allow multiple for both
          />
      ) : (
        <Input id={name} type={name.includes('date') ? 'date' : name.includes('total') ? 'number' : 'text'} placeholder={placeholder} {...register(name)} className="bg-background" />
      )}
      {errors[name] && <p className="text-sm text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Video className="mr-2 h-8 w-8 text-primary" /> Flipped Class Report</h1>
        <Button onClick={handleSubmit(generatePDF)}>
          <Download className="mr-2 h-4 w-4" /> Download as PDF
        </Button>
      </div>

      <form>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Fill out the form to generate a report for your flipped classroom or video session. All fields will be included in the PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderField('academicYear', 'Academic Year', <Calendar />, 'e.g., 2023-24')}
              {renderField('department', 'Department', <Users />, 'e.g., Computer Science', 'select', DEPARTMENTS)}
              {renderField('preparedBy', 'Prepared By', <User />, 'Faculty Name')}
            </div>

            {/* Section 2: Course Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-6">
              {renderField('subjectCode', 'Subject Code', <Hash />, 'e.g., CS301')}
              {renderField('courseName', 'Course Name', <BookCopy />, 'e.g., Data Structures')}
              {renderField('semesterSection', 'Semester / Section', <Users />, 'e.g., 5 A')}
            </div>

            {/* Section 3: Topic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('topic', 'Topic', <FileText />, 'Topic of the session')}
              {renderField('curriculumGap', 'Curriculum Gap Identified', <FileText />, 'Describe any curriculum gap', 'textarea')}
            </div>

            {/* Section 4: Session Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-6">
              {renderField('date', 'Date of Session', <Calendar />, 'Session Date')}
              {renderField('totalStudents', 'Total Number of Students', <Users />, 'e.g., 60')}
              {renderField('sessionType', 'Session Type', <Video />, '', 'select', ['Flipped Class', 'Video Session'])}
            </div>
            
            {/* Section 5: Flipped Class Specifics */}
            {watchSessionType === 'Flipped Class' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                {renderField('flippedClassType', 'Type of Flipped Classroom', <Hash />, 'e.g., Standard, Inverted', 'select', ['Standard', 'In-Class Team-Based Learning', 'Flipped Microlearning', 'Peer Instruction Flipped', 'The Faux Flipped Classroom'])}
                {renderField('materialsShared', 'Materials Shared Before Class', <FileText />, 'e.g., Video links, Reading material', 'textarea')}
              </div>
            )}
            
            {/* Section 6: Execution & Outcome */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('proofLink', 'Proof Link (Study Material)', <LinkIcon />, 'http://...')}
              {renderField('conduction', 'Conduction of Flipped Classroom', <FileText />, 'How was the session conducted?', 'textarea')}
              {renderField('evaluation', 'Evaluation (Link or Description)', <Check />, 'How was learning evaluated?', 'textarea')}
              {renderField('outcome', 'Outcome', <Star />, 'What was the outcome?', 'textarea')}
            </div>

            {/* Section 7: POs, PSOs and Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              {renderField('posAddressed', 'POs Addressed', <Hash />, 'e.g., PO1, PO2')}
              {renderField('psosAddressed', 'PSOs Addressed', <Hash />, 'e.g., PSO1')}
            </div>
             <div className="border-t pt-6">
                {renderField('remarks', 'Remarks / Additional Notes', <MessageSquare />, 'Any other comments', 'textarea')}
            </div>

            {/* Section 8: File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
               <div className="space-y-1">
                  <Label htmlFor="facultyPhoto" className="flex items-center text-muted-foreground"><span className="mr-2"><Camera /></span> Faculty Photo(s) / Signature(s) Upload</Label>
                  <FileUploadInput 
                    id="facultyPhoto" 
                    label=""
                    onFileChange={(files) => setFacultyPhotos(files as any)}
                    accept="image/*"
                    multiple
                  />
               </div>
                <div className="space-y-1">
                  <Label htmlFor="supportingImages" className="flex items-center text-muted-foreground"><span className="mr-2"><ImageIcon /></span> Supporting Image(s)</Label>
                  <FileUploadInput 
                    id="supportingImages" 
                    label=""
                    onFileChange={(files) => setSupportingImages(files as any)}
                    accept="image/*"
                    multiple
                  />
               </div>
            </div>

          </CardContent>
        </Card>
      </form>
    </div>
  );
}
