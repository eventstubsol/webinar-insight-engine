
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ParticipantSyncService } from './services/participantSyncService';
import { toast } from '@/hooks/use-toast';

/**
 * NEW: Hook for managing registrant sync operations
 */
export function useZoomParticipantSync() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  
  const syncRegistrantsForWebinar = async (webinarId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to sync registrants',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await ParticipantSyncService.syncRegistrantsForWebinar(webinarId);
      
      toast({
        title: 'Registrants synced',
        description: result.message || `Synced registrants for webinar ${webinarId}`,
        variant: 'default'
      });
      
      return result;
    } catch (error) {
      console.error('[useZoomParticipantSync] Error syncing registrants:', error);
      
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync registrant data',
        variant: 'destructive'
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const syncRegistrantsForMultipleWebinars = async (webinarIds: string[]) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to sync registrants',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await ParticipantSyncService.syncRegistrantsForWebinars(webinarIds);
      
      toast({
        title: 'Bulk registrant sync completed',
        description: result.message || `Synced registrants for ${webinarIds.length} webinars`,
        variant: 'default'
      });
      
      return result;
    } catch (error) {
      console.error('[useZoomParticipantSync] Error syncing multiple registrants:', error);
      
      toast({
        title: 'Bulk sync failed',
        description: error.message || 'Failed to sync registrant data for multiple webinars',
        variant: 'destructive'
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkSyncStatus = async () => {
    if (!user) return null;
    
    try {
      const status = await ParticipantSyncService.getRegistrantSyncStatus(user.id);
      setSyncStatus(status);
      return status;
    } catch (error) {
      console.error('[useZoomParticipantSync] Error checking sync status:', error);
      return null;
    }
  };
  
  const getWebinarsNeedingSync = async () => {
    if (!user) return [];
    
    try {
      return await ParticipantSyncService.getWebinarsNeedingRegistrantSync(user.id);
    } catch (error) {
      console.error('[useZoomParticipantSync] Error getting webinars needing sync:', error);
      return [];
    }
  };
  
  return {
    isLoading,
    syncStatus,
    syncRegistrantsForWebinar,
    syncRegistrantsForMultipleWebinars,
    checkSyncStatus,
    getWebinarsNeedingSync
  };
}
