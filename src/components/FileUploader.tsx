import React, { useState, useRef } from 'react';
import { FileUp, X, File, Loader2, Check } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  initialFileName?: string | null;
}

export function FileUploader({
  onFileSelect,
  onClearFile,
  acceptedFileTypes = 'application/pdf,image/*',
  maxSizeMB = 5,
  initialFileName = null
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [existingFileName, setExistingFileName] = useState<string | null>(initialFileName);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setFileError(null);
      setSelectedFile(null);
      setUploadStatus('idle');
      return;
    }
    
    // Validate file size
    if (file.size > maxSizeBytes) {
      setFileError(`File size exceeds ${maxSizeMB}MB limit`);
      setSelectedFile(null);
      setUploadStatus('error');
      return;
    }
    
    // Validate file type
    const fileTypeAccepted = acceptedFileTypes
      .split(',')
      .some(type => {
        if (type.includes('*')) {
          const category = type.split('/')[0];
          return file.type.startsWith(`${category}/`);
        }
        return file.type === type;
      });
      
    if (!fileTypeAccepted) {
      setFileError(`File type not accepted. Please upload ${acceptedFileTypes.replace(/,/g, ' or ')}`);
      setSelectedFile(null);
      setUploadStatus('error');
      return;
    }
    
    setFileError(null);
    setSelectedFile(file);
    setExistingFileName(null);
    setUploadStatus('success');
    onFileSelect(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };
  
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleClear = () => {
    setSelectedFile(null);
    setFileError(null);
    setExistingFileName(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClearFile();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : fileError
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={acceptedFileTypes}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            handleFileChange(file);
          }}
        />
        
        {!selectedFile && !existingFileName ? (
          <div className="flex flex-col items-center justify-center py-4">
            <FileUp className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              Drag & drop a file here, or{' '}
              <button
                type="button"
                onClick={handleButtonClick}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Accepted file types: {acceptedFileTypes.replace(/,/g, ', ')}
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: {maxSizeMB}MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center">
              <File className="h-6 w-6 text-gray-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {selectedFile?.name || existingFileName || ''}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedFile && `${(selectedFile.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {uploadStatus === 'uploading' ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2" />
              ) : uploadStatus === 'success' ? (
                <Check className="h-5 w-5 text-green-500 mr-2" />
              ) : null}
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {fileError && (
        <p className="mt-1 text-xs text-red-600">{fileError}</p>
      )}
    </div>
  );
} 