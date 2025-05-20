
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/useZoomApi';
import { LoaderCircle } from 'lucide-react';

const Webinars = () => {
  const { webinars, isLoading, isRefetching, refreshWebinars } = useZoomWebinars();
  
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
            <p className="text-muted-foreground">Manage and analyze your Zoom webinar events</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshWebinars}
              disabled={isLoading || isRefetching}
            >
              {isRefetching ? (
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Webinar
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <WebinarsList webinars={webinars} isLoading={isLoading} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Webinars;
