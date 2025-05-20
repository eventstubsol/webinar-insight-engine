
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const Webinars = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
            <p className="text-muted-foreground">Manage and analyze your webinar events</p>
          </div>
          <div>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Webinar
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <WebinarsList />
        </div>
      </div>
    </AppLayout>
  );
};

export default Webinars;
