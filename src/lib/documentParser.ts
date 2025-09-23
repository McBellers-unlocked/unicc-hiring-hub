import { supabase } from '@/integrations/supabase/client';

// Document parsing service for PHF files
export class DocumentParser {
  
  // Parse a PHF document and extract text content
  static async parseDocument(file: File): Promise<string> {
    console.log('📄 Starting document parsing for:', file.name);
    
    try {
      // For PDF and DOCX files, we need to use a document parsing service
      if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx')) {
        
        // Upload file to storage temporarily for parsing
        const fileName = `temp-parse-${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('application-files')
          .upload(fileName, file);
          
        if (uploadError) {
          console.error('❌ Failed to upload file for parsing:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        try {
          // Call edge function to parse the document
          const { data: parseData, error: parseError } = await supabase.functions
            .invoke('parse-phf-document', {
              body: { fileName: uploadData.path }
            });
            
          if (parseError) {
            console.error('❌ Document parsing failed:', parseError);
            throw new Error(`Parse failed: ${parseError.message}`);
          }
          
          // Clean up temporary file
          await supabase.storage
            .from('application-files')
            .remove([uploadData.path]);
            
          console.log('✅ Document parsed successfully');
          return parseData.content || '';
          
        } catch (parseError) {
          // Clean up on error
          await supabase.storage
            .from('application-files')
            .remove([uploadData.path]);
          throw parseError;
        }
      }
      
      // For text files, read directly
      return await file.text();
      
    } catch (error) {
      console.error('❌ Document parsing error:', error);
      throw error;
    }
  }
  
  // Extract candidate name from PHF document text
  static extractCandidateName(documentText: string): string | null {
    console.log('🔍 Extracting candidate name from document text');
    
    // Pattern 1: Standard PHF table format
    // | Family name | First/other names | Mr/Mrs/Ms/Miss |
    // | Quinones Vila | Claudia Sofia | Ms |
    const phfTablePattern = /\|\s*([A-Za-z\s\-']+)\s*\|\s*([A-Za-z\s\-']+)\s*\|\s*(?:Mr|Mrs|Ms|Miss)/i;
    const phfMatch = documentText.match(phfTablePattern);
    
    if (phfMatch && phfMatch[1] && phfMatch[2]) {
      const familyName = phfMatch[1].trim();
      const firstName = phfMatch[2].trim();
      const fullName = `${firstName} ${familyName}`;
      console.log('✅ Extracted name from PHF table:', fullName);
      return fullName;
    }
    
    // Pattern 2: Alternative table format
    const altTablePattern = /Family name[^|]*\|[^|]*First\/other names[^|]*\|[^\n]*\n[^|]*\|\s*([A-Za-z\s\-']+)\s*\|\s*([A-Za-z\s\-']+)\s*\|/i;
    const altMatch = documentText.match(altTablePattern);
    
    if (altMatch && altMatch[1] && altMatch[2]) {
      const familyName = altMatch[1].trim();
      const firstName = altMatch[2].trim();
      const fullName = `${firstName} ${familyName}`;
      console.log('✅ Extracted name from alternative table:', fullName);
      return fullName;
    }
    
    // Pattern 3: Look for Name: field
    const nameFieldPattern = /Name:\s*([A-Za-z\s\-']+)/i;
    const nameMatch = documentText.match(nameFieldPattern);
    
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      console.log('✅ Extracted name from Name field:', name);
      return name;
    }
    
    // Pattern 4: Look for structured personal info section
    const personalInfoPattern = /PERSONAL\s+(?:PARTICULARS|INFORMATION)[^|]*\|[^|]*Family name[^|]*\|[^|]*First[^|]*\|[^\n]*\n[^|]*\|\s*([A-Za-z\s\-']+)\s*\|\s*([A-Za-z\s\-']+)\s*\|/i;
    const personalMatch = documentText.match(personalInfoPattern);
    
    if (personalMatch && personalMatch[1] && personalMatch[2]) {
      const familyName = personalMatch[1].trim();
      const firstName = personalMatch[2].trim();
      const fullName = `${firstName} ${familyName}`;
      console.log('✅ Extracted name from personal info section:', fullName);
      return fullName;
    }
    
    console.log('❌ Could not extract candidate name from document');
    return null;
  }
  
  // Extract email from document text
  static extractEmail(documentText: string): string | null {
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = documentText.match(emailPattern);
    return match ? match[1] : null;
  }
  
  // Extract phone from document text
  static extractPhone(documentText: string): string | null {
    const phonePattern = /(?:Telephone|Phone)[^|]*\|[^|]*([+\d\s()-]+)/i;
    const match = documentText.match(phonePattern);
    return match ? match[1].trim() : null;
  }
}