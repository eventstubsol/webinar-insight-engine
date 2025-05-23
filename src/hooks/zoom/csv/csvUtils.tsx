
import { formatDate } from '@/utils/formatUtils';
import { useToast } from '@/hooks/use-toast';

/**
 * Exports data to a CSV file
 */
export const exportToCSV = async <T extends Record<string, any>>(
  data: T[], 
  filename: string
): Promise<void> => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Convert data to CSV format
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(',')
  ).join('\n');
  
  const csvContent = `${headers}\n${rows}`;
  
  // Create a blob and download it
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${formatDate(new Date())}.csv`);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return;
};

/**
 * Handle CSV export with error handling
 */
export const handleExportWithNotification = async <T extends Record<string, any>>(
  data: T[],
  filename: string,
  toast: ReturnType<typeof useToast>['toast'],
  setIsExporting: (value: boolean) => void
): Promise<void> => {
  try {
    setIsExporting(true);
    await exportToCSV(data, filename);
    
    toast({
      title: "Export successful",
      description: `${filename} has been downloaded as a CSV file.`
    });
  } catch (error) {
    console.error("Export error:", error);
    toast({
      title: "Export failed",
      description: "There was an error exporting the data. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsExporting(false);
  }
};
