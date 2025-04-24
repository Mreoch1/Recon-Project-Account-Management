import { supabase } from './supabase';
import { Contractor, Invoice } from './types';

// DeepSeek API key - should be moved to environment variables in production
const DEEPSEEK_API_KEY = 'sk-2300da542e2a4198875e9e0833fa8f07';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Models
const DEEPSEEK_TEXT_MODEL = 'deepseek-coder'; // Better for text analysis
const DEEPSEEK_VISION_MODEL = 'deepseek-vision'; // Better for PDF analysis

/**
 * Extracts text content from a PDF file
 * @param fileUrl URL of the PDF file
 * @returns Extracted text content
 */
export async function extractTextFromPdf(fileUrl: string): Promise<string> {
  try {
    // Fetch the PDF file
    const response = await fetch(fileUrl);
    const fileBlob = await response.blob();
    
    // Convert to base64 for processing
    const base64String = await blobToBase64(fileBlob);
    
    // Use DeepSeek API to extract text from PDF
    const extractedText = await extractTextUsingDeepseek(base64String);
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Converts a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Processes invoice data using DeepSeek AI
 * @param invoiceText The text content of the invoice
 * @returns Structured invoice data
 */
export async function processInvoiceData(invoiceText: string): Promise<{
  invoiceNumber: string;
  description: string;
  amount: number;
  vendorName: string;
  vendorEmail?: string;
  vendorPhone?: string;
}> {
  try {
    const prompt = `
Extract the following information from this invoice:
1. Invoice Number
2. Description or Items (summarize if multiple)
3. Total Amount
4. Vendor/Contractor Name
5. Vendor Email (if available)
6. Vendor Phone (if available)

Format the response as a JSON object with the following keys:
invoiceNumber, description, amount (as a number), vendorName, vendorEmail, vendorPhone

Invoice text:
${invoiceText}
`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_TEXT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API error:', errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    // Validate and sanitize the response
    return {
      invoiceNumber: result.invoiceNumber || 'Unknown',
      description: result.description || 'No description',
      amount: parseFloat(result.amount) || 0,
      vendorName: result.vendorName || 'Unknown Vendor',
      vendorEmail: result.vendorEmail,
      vendorPhone: result.vendorPhone
    };
  } catch (error) {
    console.error('Error processing invoice with DeepSeek:', error);
    throw new Error('Failed to process invoice data');
  }
}

/**
 * Uses DeepSeek to extract text from a PDF base64 string
 */
async function extractTextUsingDeepseek(base64Pdf: string): Promise<string> {
  try {
    const prompt = `
Extract all the text content from this PDF invoice.
Output only the raw text content without any additional commentary.
`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek PDF extraction error:', errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error extracting text using DeepSeek:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Finds a matching contractor or creates a new one
 * @param vendorInfo The vendor information from the invoice
 * @param projectId The project ID to associate with
 * @returns The contractor ID
 */
export async function findOrCreateContractor(
  vendorInfo: { 
    vendorName: string;
    vendorEmail?: string;
    vendorPhone?: string;
  },
  projectId: string
): Promise<string> {
  try {
    // First, try to find an existing contractor by name (case insensitive)
    const { data: existingContractors, error: searchError } = await supabase
      .from('contractors')
      .select('*')
      .ilike('name', vendorInfo.vendorName);
    
    if (searchError) throw searchError;
    
    // If found, return the first matching contractor
    if (existingContractors && existingContractors.length > 0) {
      console.log('Found existing contractor:', existingContractors[0]);
      
      // Also make sure this contractor is associated with the project
      await ensureContractorInProject(existingContractors[0].id, projectId);
      
      return existingContractors[0].id;
    }
    
    // Otherwise, create a new contractor
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a contractor');
    }
    
    const { data: newContractor, error: createError } = await supabase
      .from('contractors')
      .insert([{
        name: vendorInfo.vendorName,
        email: vendorInfo.vendorEmail || null,
        phone: vendorInfo.vendorPhone || null,
        description: `Auto-created from invoice upload`,
        contract_value: 0, // Starting with zero, will be updated as invoices are added
        user_id: user.id
      }])
      .select()
      .single();
    
    if (createError) throw createError;
    if (!newContractor) throw new Error('Failed to create contractor');
    
    console.log('Created new contractor:', newContractor);
    
    // Associate the new contractor with the project
    await ensureContractorInProject(newContractor.id, projectId);
    
    return newContractor.id;
  } catch (error) {
    console.error('Error finding or creating contractor:', error);
    throw new Error('Failed to find or create contractor');
  }
}

/**
 * Ensures a contractor is associated with a project
 */
async function ensureContractorInProject(contractorId: string, projectId: string): Promise<void> {
  try {
    // Check if the association already exists
    const { data: existingAssociation, error: checkError } = await supabase
      .from('project_contractors')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId);
    
    if (checkError) throw checkError;
    
    // If the association doesn't exist, create it
    if (!existingAssociation || existingAssociation.length === 0) {
      const { error: insertError } = await supabase
        .from('project_contractors')
        .insert([{
          project_id: projectId,
          contractor_id: contractorId
        }]);
      
      if (insertError) throw insertError;
      console.log('Associated contractor with project');
    } else {
      console.log('Contractor already associated with project');
    }
  } catch (error) {
    console.error('Error ensuring contractor in project:', error);
    throw new Error('Failed to associate contractor with project');
  }
}

/**
 * Creates an invoice from processed data
 */
export async function createInvoiceFromData(
  invoiceData: {
    invoiceNumber: string;
    description: string;
    amount: number;
  },
  contractorId: string,
  projectId: string,
  fileUrl: string
): Promise<Invoice> {
  try {
    // Get 30 days from now for the due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceData.invoiceNumber,
        description: invoiceData.description,
        amount: invoiceData.amount,
        contractor_id: contractorId,
        project_id: projectId,
        file_url: fileUrl,
        status: 'pending',
        due_date: dueDateStr
      }])
      .select()
      .single();
    
    if (error) throw error;
    if (!newInvoice) throw new Error('Failed to create invoice');
    
    console.log('Created new invoice:', newInvoice);
    return newInvoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
} 