
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * BaseZoomService - Base class with shared utilities for Zoom services
 */
export class BaseZoomService {
  /**
   * Helper method to show toast notifications
   */
  protected static showToast(title: string, description: string, variant: 'default' | 'destructive' | 'success' | 'warning' = 'default') {
    toast({
      title,
      description,
      variant
    });
  }

  /**
   * Helper method for API calls to edge functions with validation and error categorization
   */
  protected static async invokeEdgeFunction(action: string, params: Record<string, any> = {}) {
    try {
      // Validate required parameters
      this.validateParams(action, params);
      
      console.log(`[BaseZoomService] Invoking edge function: ${action}`, params);
      
      // Make the API call
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action,
          ...params
        }
      });
      
      if (error) {
        console.error(`[BaseZoomService] Edge function error:`, error);
        // Categorize and handle error
        this.handleApiError(error, action);
      }
      
      console.log(`[BaseZoomService] Edge function response for ${action}:`, data);
      
      // Validate response data
      this.validateResponseData(action, data);
      
      return data;
    } catch (error) {
      console.error(`[BaseZoomService] Error invoking edge function (${action}):`, error);
      throw this.enhanceError(error, action);
    }
  }
  
  /**
   * Validates parameters before making an API call
   */
  private static validateParams(action: string, params: Record<string, any>) {
    // Validation based on action type
    switch (action) {
      case 'get-webinar':
      case 'get-participants':
        if (!params.id) {
          throw new Error(`Missing required parameter: id for action ${action}`);
        }
        break;
      case 'get-webinar-instances':
        if (!params.webinar_id) {
          throw new Error(`Missing required parameter: webinar_id for action ${action}`);
        }
        break;
      case 'get-instance-participants':
        if (!params.webinar_id || !params.instance_id) {
          throw new Error(`Missing required parameters for action ${action}`);
        }
        break;
    }
  }
  
  /**
   * Validates response data
   */
  private static validateResponseData(action: string, data: any) {
    // Ensure data is not null/undefined
    if (!data) {
      throw new Error(`Invalid response data for action ${action}`);
    }
    
    // Basic validation based on action type
    switch (action) {
      case 'list-webinars':
        if (!Array.isArray(data.webinars)) {
          throw new Error('Invalid webinar list in response');
        }
        break;
      case 'get-webinar':
        if (!data.id) {
          throw new Error('Invalid webinar data in response');
        }
        break;
      case 'get-participants':
        // Check for required fields in participant data
        break;
    }
  }
  
  /**
   * Handles API errors with categorization
   */
  private static handleApiError(error: any, action: string) {
    // Extract error message
    const errorMessage = error.message || 'Unknown error';
    
    // Check for specific error types
    if (errorMessage.includes('rate limit')) {
      throw new Error(`Rate limit exceeded for ${action}. Please try again later.`);
    } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      throw new Error('Authentication failed. Please reconnect your Zoom account.');
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw new Error(`Resource not found for ${action}.`);
    }
    
    throw error;
  }
  
  /**
   * Enhances errors with more context and details
   */
  private static enhanceError(error: any, action: string): Error {
    const errorMessage = error.message || 'Unknown error';
    const enhancedError = new Error(`${action} failed: ${errorMessage}`);
    
    // Add extra properties for debugging
    (enhancedError as any).originalError = error;
    (enhancedError as any).apiAction = action;
    (enhancedError as any).timestamp = new Date().toISOString();
    
    return enhancedError;
  }
}
