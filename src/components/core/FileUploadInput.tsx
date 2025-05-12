'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface FileUploadInputProps {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
  accept?: string;
  currentFile?: string; // To display if a file is already "uploaded"
}

export function FileUploadInput({ id, label, onFileChange, accept, currentFile }: FileUploadInputProps) {
  const [fileName, setFileName] = useState<string | null>(currentFile || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
    setFileName(file ? file.name : null);
  };

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" onChange={handleFileChange} accept={accept} className="bg-background"/>
      {fileName && <p className="text-sm text-muted-foreground mt-1">Selected: {fileName}</p>}
      {!fileName && currentFile && <p className="text-sm text-muted-foreground mt-1">Current: {currentFile}</p>}
    </div>
  );
}
