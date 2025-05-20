
// This file is kept for backward compatibility
// All functionality has been moved to more focused hooks in the zoom directory
import {
  ZoomWebinar,
  ZoomParticipants,
  ZoomCredentialsStatus,
  useZoomCredentials,
  useZoomCredentialsVerification,
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
  useZoomCredentialsVerification,
  useZoomWebinars,
  useZoomWebinarDetails,
  useZoomWebinarParticipants
};
