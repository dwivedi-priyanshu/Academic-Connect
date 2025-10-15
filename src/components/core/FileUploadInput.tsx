
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

interface FileUploadInputProps {
  id: string;
  label: string;
  onFileChange: (file: File | FileList | null) => void;
  accept?: string;
  currentFile?: string; 
  disabled?: boolean;
  multiple?: boolean; 
}

export function FileUploadInput({ id, label, onFileChange, accept, currentFile, disabled, multiple = false }: FileUploadInputProps) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [inputKey, setInputKey] = useState<string>(id);

  useEffect(() => {
    if (currentFile) {
        setFileNames([currentFile]);
    } else {
        setFileNames([]);
    }
    if (!currentFile) {
      setInputKey(`${id}-${Date.now()}`);
    }
  }, [currentFile, id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (multiple) {
        onFileChange(files);
        setFileNames(files ? Array.from(files).map(f => f.name) : []);
    } else {
        const file = files?.[0] || null;
        onFileChange(file);
        setFileNames(file ? [file.name] : []);
    }
  };

  return (
    <div className="grid w-full items-center gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input 
        id={id} 
        key={inputKey}
        type="file" 
        onChange={handleFileChange} 
        accept={accept} 
        className="bg-background file:text-primary file:font-semibold"
        disabled={disabled}
        multiple={multiple}
      />
      {fileNames.length > 0 && <p className="text-sm text-muted-foreground mt-1">Selected: {fileNames.join(', ')}</p>}
      {!fileNames.length && currentFile && <p className="text-sm text-muted-foreground mt-1">Current: {currentFile}</p>}
      {!fileNames.length && !currentFile && <p className="text-sm text-muted-foreground mt-1">No file selected.</p>}
    </div>
  );
}
