
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface CreateAppStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const CreateAppStep: React.FC<CreateAppStepProps> = ({
  onNext,
  onBack
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Step 1: Create a Server-to-Server OAuth App</h3>
      
      <ol className="space-y-4 list-decimal pl-5">
        <li>
          <div className="font-medium">Go to the Zoom App Marketplace</div>
          <p className="text-muted-foreground text-sm mt-1">
            Visit the Zoom App Marketplace and sign in with your Zoom account
          </p>
          <Button variant="outline" className="mt-2" asChild>
            <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noopener noreferrer" className="flex items-center">
              Open Zoom Marketplace
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </li>
        
        <li>
          <div className="font-medium">Click on "Develop" and then "Build App"</div>
          <p className="text-muted-foreground text-sm mt-1">
            In the dropdown menu, select "Server-to-Server OAuth" as the app type
          </p>
          <div className="mt-2 rounded-md border p-3 bg-gray-50">
            <img 
              src="https://i.imgur.com/NeSvJmN.png" 
              alt="Select Server-to-Server OAuth" 
              className="rounded-md max-w-full h-auto"
            />
          </div>
        </li>

        <li>
          <div className="font-medium">Name your app</div>
          <p className="text-muted-foreground text-sm mt-1">
            Give your app a name like "ZoomLytics Integration" and provide a short description
          </p>
        </li>
      </ol>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="mt-4 sm:mt-0">
          Continue to Scopes
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
