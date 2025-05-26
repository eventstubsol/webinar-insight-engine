
// Re-export from the new centralized API client
export * from './zoomApiClient';

// Specific method aliases for backward compatibility
export const syncTimingDataAPI = () => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.syncTimingData();
};

export const updateParticipantDataAPI = () => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.updateParticipantData();
};

export const fetchWebinarsFromAPI = (forceSync: boolean = false) => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.listWebinars(forceSync);
};

export const refreshWebinarsFromAPI = (forceSync: boolean = false) => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.listWebinars(forceSync);
};

export const fetchWebinarInstancesAPI = (webinarId: string) => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.getWebinarInstances(webinarId);
};

export const fetchInstanceParticipantsAPI = (webinarId: string, instanceId: string) => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.getInstanceParticipants(webinarId, instanceId);
};

export const fetchWebinarRecordingsAPI = (webinarId: string) => {
  const { zoomApiClient } = require('./zoomApiClient');
  return zoomApiClient.getWebinarRecordings(webinarId);
};
