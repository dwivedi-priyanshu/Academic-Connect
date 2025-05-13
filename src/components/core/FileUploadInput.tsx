
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

interface FileUploadInputProps {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
  accept?: string;
  currentFile?: string; 
  disabled?: boolean; 
}

export function FileUploadInput({ id, label, onFileChange, accept, currentFile, disabled }: FileUploadInputProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    // Update fileName if currentFile prop changes (e.g. form reset)
    setFileName(currentFile || null);
  }, [currentFile]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
    setFileName(file ? file.name : (currentFile || null)); // Keep current if new file is removed
  };

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input 
        id={id} 
        type="file" 
        onChange={handleFileChange} 
        accept={accept} 
        className="bg-background"
        disabled={disabled}
        key={currentFile || 'file-input'} // Force re-render if currentFile changes, to clear displayed file name
      />
      {fileName && fileName !== currentFile && <p className="text-sm text-muted-foreground mt-1">Selected: {fileName}</p>}
      {currentFile && <p className="text-sm text-muted-foreground mt-1">Current: {currentFile}</p>}
      {!fileName && !currentFile && <p className="text-sm text-muted-foreground mt-1">No file selected.</p>}
    </div>
  );
}
