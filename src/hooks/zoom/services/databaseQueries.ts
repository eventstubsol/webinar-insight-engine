
// Re-export from the new database service
export * from './zoomDatabaseService';

// Specific method aliases for backward compatibility
export const fetchWebinarsFromDatabase = (userId: string) => {
  const { zoomDatabaseService } = require('./zoomDatabaseService');
  return zoomDatabaseService.getWebinars(userId);
};

export const fetchWebinarInstancesFromDatabase = (userId: string, webinarId?: string) => {
  const { zoomDatabaseService } = require('./zoomDatabaseService');
  return zoomDatabaseService.getWebinarInstances(userId, webinarId);
};
