import React, { useState } from 'react';
import { FileUploader } from './FileUploader';
import { uploadFile } from '../lib/fileStorage';
import { extractTextFromPdf, processInvoiceData, findOrCreateContractor, createInvoiceFromData } from '../lib/deepseek';
import { Project } from '../lib/types';
import { FileText, AlertCircle, Check, Loader2 } from 'lucide-react';

interface AutoInvoiceUploaderProps {
  project: Project;
  onInvoiceCreated: () => void;
}

export function AutoInvoiceUploader({ project, onInvoiceCreated }: AutoInvoiceUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    invoiceNumber: string;
    amount: number;
    vendorName: string;
    description: string;
  } | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setStatus('idle');
    setResult(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setStatus('idle');
    setResult(null);
  };

  const handleProcess = async () => {
    if (!selectedFile || !project || !project.id) return;

    try {
      setStatus('uploading');
      setProcessing(true);
      setError(null);

      // 1. Upload the file
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `auto/${project.id}/${fileName}`;
      
      const fileUrl = await uploadFile(selectedFile, filePath);
      if (!fileUrl) {
        throw new Error('Failed to upload file');
      }

      // 2. Extract text from the PDF
      setStatus('processing');
      setError(null);
      const extractedText = await extractTextFromPdf(fileUrl);
      
      // 3. Process the invoice data with DeepSeek
      const invoiceData = await processInvoiceData(extractedText);
      
      // 4. Find or create the contractor
      const contractorId = await findOrCreateContractor(
        {
          vendorName: invoiceData.vendorName,
          vendorEmail: invoiceData.vendorEmail,
          vendorPhone: invoiceData.vendorPhone
        },
        project.id
      );
      
      // 5. Create the invoice
      await createInvoiceFromData(
        {
          invoiceNumber: invoiceData.invoiceNumber,
          description: invoiceData.description,
          amount: invoiceData.amount
        },
        contractorId,
        project.id,
        fileUrl
      );
      
      // 6. Success!
      setStatus('success');
      setResult({
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        vendorName: invoiceData.vendorName,
        description: invoiceData.description
      });
      
      // 7. Notify parent
      onInvoiceCreated();
      
    } catch (err: any) {
      console.error('Error in auto invoice processing:', err);
      setStatus('error');
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">AI Invoice Processing</h2>
      <p className="text-gray-600 mb-6">
        Upload an invoice PDF and our AI will automatically extract the information and create an invoice for the correct contractor.
      </p>
      
      <div className="mb-6">
        <FileUploader
          onFileSelect={handleFileSelect}
          onClearFile={handleClearFile}
          acceptedFileTypes="application/pdf"
          maxSizeMB={10}
        />
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
            <div>
              <p className="text-sm font-medium text-green-800">Invoice successfully processed!</p>
              <ul className="mt-2 text-sm text-green-700">
                <li><span className="font-medium">Invoice #:</span> {result.invoiceNumber}</li>
                <li><span className="font-medium">Amount:</span> ${result.amount.toLocaleString()}</li>
                <li><span className="font-medium">Vendor:</span> {result.vendorName}</li>
                <li><span className="font-medium">Description:</span> {result.description}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleProcess}
          disabled={!selectedFile || processing}
          className={`px-4 py-2 rounded-md flex items-center ${
            !selectedFile || processing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } transition-colors`}
        >
          {processing && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {status === 'idle' && <FileText className="h-4 w-4 mr-2" />}
          {status === 'uploading' && 'Uploading...'}
          {status === 'processing' && 'Processing with AI...'}
          {status === 'success' && 'Processed Successfully'}
          {status === 'error' && 'Try Again'}
          {status === 'idle' && 'Process Invoice with AI'}
        </button>
      </div>
    </div>
  );
} 