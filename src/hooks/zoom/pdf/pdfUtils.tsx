
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Creates a PDF from an HTML element with the given ID
 */
export const generatePdfFromElement = async (
  elementId: string, 
  filename: string
): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Element not found for PDF export");
  }

  // Create canvas from the element
  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true
  });
  
  // Create PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
  
  return filename;
};

/**
 * Creates a temporary div element for PDF generation
 */
export const createTempDivForPdf = (
  elementId: string, 
  content: string
): HTMLDivElement => {
  // Create a temporary div for generating the PDF content
  const tempDiv = document.createElement('div');
  tempDiv.id = elementId;
  tempDiv.style.padding = "20px";
  tempDiv.style.backgroundColor = "white";
  tempDiv.style.width = "800px";
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.innerHTML = content;
  
  return tempDiv;
};

/**
 * Handles the complete PDF generation process
 */
export const generateAndDownloadPdf = async (
  elementId: string, 
  content: string, 
  filename: string
): Promise<void> => {
  const tempDiv = createTempDivForPdf(elementId, content);
  document.body.appendChild(tempDiv);
  
  try {
    await generatePdfFromElement(elementId, filename);
  } finally {
    // Always clean up the temporary div
    document.body.removeChild(tempDiv);
  }
};
