import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Validates the uploaded file before parsing
 */
export function validateFile(file) {
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const ALLOWED_TYPES = [
    'application/pdf',
  ];
  const ALLOWED_EXTENSIONS = ['.pdf'];

  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const extension = '.' + file.name.split('.').pop().toLowerCase();

  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: `Unsupported file type "${extension}". Please upload a PDF file.` };
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File is too large (${sizeMB}MB). Maximum size is 20MB.` };
  }

  return { valid: true, error: null };
}

/**
 * Extracts text content from a PDF file.
 * 
 * @param {File} file - The PDF file to extract text from
 * @param {Function} onProgress - Optional callback (progress: 0-1)
 * @returns {Promise<Object>} Parsed result with pages, metadata, and full text
 */
export async function extractTextFromPDF(file, onProgress) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages = [];
    let totalWords = 0;
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Reconstruct text with proper spacing
      let pageText = '';
      let lastY = null;

      for (const item of textContent.items) {
        if (item.str.trim() === '') continue;

        // Detect line breaks based on Y position changes
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith('\n')) {
          pageText += ' ';
        }

        pageText += item.str;
        lastY = item.transform[5];
      }

      const trimmedText = pageText.trim();
      const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;

      pages.push({
        pageNumber: pageNum,
        text: trimmedText,
        wordCount,
        charCount: trimmedText.length,
      });

      totalWords += wordCount;
      totalChars += trimmedText.length;

      // Report progress
      if (onProgress) {
        onProgress(pageNum / pdf.numPages);
      }
    }

    const fullText = pages.map(p => p.text).join('\n\n');

    return {
      success: true,
      fileName: file.name,
      fileSize: file.size,
      pages,
      totalPages: pdf.numPages,
      totalWords,
      totalChars,
      fullText,
      parsedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Handle specific PDF.js errors
    if (err.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }

    if (err.name === 'InvalidPDFException') {
      throw new Error('This file appears to be corrupted or is not a valid PDF.');
    }

    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
