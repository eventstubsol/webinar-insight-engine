
import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export function deduplicateWebinars(webinars: WebinarFieldMapping[]): WebinarFieldMapping[] {
  console.log(`🔄 Deduplicating ${webinars.length} webinars`);
  
  const seen = new Set<string>();
  const deduplicated: WebinarFieldMapping[] = [];
  
  for (const webinar of webinars) {
    const key = webinar.id;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(webinar);
    } else {
      console.log(`🔄 Skipping duplicate webinar: ${key}`);
    }
  }
  
  console.log(`🔄 Deduplicated: ${webinars.length} → ${deduplicated.length} webinars`);
  return deduplicated;
}
