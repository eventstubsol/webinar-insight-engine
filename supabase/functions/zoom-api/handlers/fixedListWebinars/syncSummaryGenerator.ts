
export function generateSyncSummary(
  allWebinars: any[],
  uniqueWebinars: any[],
  successCount: number,
  errorCount: number,
  instanceSyncResults: any
) {
  const historicalCount = allWebinars.filter(w => w.is_historical).length;
  const upcomingCount = allWebinars.filter(w => !w.is_historical).length;
  
  const webinarsBySource = allWebinars.reduce((acc, webinar) => {
    const source = webinar.data_source || 'regular';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalCollected: allWebinars.length,
    uniqueWebinars: uniqueWebinars.length,
    successfulUpserts: successCount,
    errors: errorCount,
    webinarsBySource,
    historicalWebinars: historicalCount,
    upcomingWebinars: upcomingCount,
    webinarsWithProperTopics: allWebinars.filter(w => w.topic && w.topic !== 'Untitled Webinar').length,
    instanceSync: instanceSyncResults
  };
}
