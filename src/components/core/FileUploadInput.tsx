
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
  const [inputKey, setInputKey] = useState<string>(id); // Key for resetting file input

  useEffect(() => {
    // Update fileName if currentFile prop changes (e.g. form reset or initial load)
    setFileName(currentFile || null);
    if (!currentFile) {
      // If currentFile is cleared externally, reset the input key to clear the displayed file
      setInputKey(`${id}-${Date.now()}`);
    }
  }, [currentFile, id]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
    setFileName(file ? file.name : null); // Only show selected file, or null if cleared.
                                          // currentFile prop handles showing existing server file.
  };

  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input 
        id={id} 
        key={inputKey} // Key to force re-render and reset of file input
        type="file" 
        onChange={handleFileChange} 
        accept={accept} 
        className="bg-background"
        disabled={disabled}
      />
      {fileName && <p className="text-sm text-muted-foreground mt-1">Selected: {fileName}</p>}
      {!fileName && currentFile && <p className="text-sm text-muted-foreground mt-1">Current: {currentFile}</p>}
      {!fileName && !currentFile && <p className="text-sm text-muted-foreground mt-1">No file selected.</p>}
    </div>
  );
}

