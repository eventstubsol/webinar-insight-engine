
// This file is kept for backward compatibility
// All functionality has been moved to more focused hooks in the zoom directory
import {
  ZoomWebinar,
  ZoomParticipants,
  ZoomCredentialsStatus,
  useZoomCredentials,
  useZoomWebinars,
  useZoomWebinarDetails,
  useZoomWebinarParticipants
} from './zoom';

export type {
  ZoomWebinar,
  ZoomParticipants,
  ZoomCredentialsStatus
};

export {
  useZoomCredentials,
  useZoomWebinars,
  useZoomWebinarDetails,
  useZoomWebinarParticipants
};
