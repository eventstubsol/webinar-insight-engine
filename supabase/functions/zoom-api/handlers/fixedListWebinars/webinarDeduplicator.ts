import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export function deduplicateWebinars(webinars: WebinarFieldMapping[]): WebinarFieldMapping[] {
  console.log(`📊 Starting deduplication of ${webinars.length} webinars`);
  
  const uniqueWebinars = webinars.reduce((acc, current) => {
    const existing = acc.find(w => w.id === current.id);
    if (!existing) {
      acc.push(current);
    } else {
      // Keep the one with more complete data
      if (current.topic !== 'Untitled Webinar' && existing.topic === 'Untitled Webinar') {
        const index = acc.findIndex(w => w.id === current.id);
        acc[index] = current;
      }
    }
    return acc;
  }, [] as WebinarFieldMapping[]);
  
  console.log(`📊 Unique webinars after deduplication: ${uniqueWebinars.length}`);
  return uniqueWebinars;
}
