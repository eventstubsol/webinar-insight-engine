
import React from 'react';
import { Settings, ExternalLink, AlertTriangle, Copy, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WebinarSetupGuideProps {
  errorMessage?: string | null; // Added to match the props passed from WebinarTabs
  errorDetails?: {  // Made optional to match real usage
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  scopesError: boolean;
  isVerifying: boolean;
  verified: boolean | undefined;
  verificationDetails: any;
}

export const WebinarSetupGuide: React.FC<WebinarSetupGuideProps> = ({
  errorMessage,
  errorDetails,
  scopesError,
  isVerifying,
  verified,
  verificationDetails
}) => {
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `${label} has been copied to your clipboard.`
      });
    });
  };

  const renderScopesWarning = () => (
    <Alert variant="warning" className="bg-amber-50 border-amber-200 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Missing Required OAuth Scopes</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p>Your Zoom Server-to-Server OAuth app is missing some required scopes.</p>
        <p className="font-semibold mt-2">Required OAuth Scopes:</p>
        <ul className="list-disc pl-6 mt-1 space-y-1">
          <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:admin</code></li>
          <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:master</code></li>
          <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:read:webinar:admin</code></li>
          <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:write:webinar:admin</code></li>
        </ul>
        <div className="mt-3">
          <Button variant="outline" className="gap-1" asChild>
            <a href="https://marketplace.zoom.us/develop/apps" target="_blank" rel="noopener noreferrer">
              <Settings className="h-4 w-4" />
              Update App Scopes in Zoom Marketplace
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-500" />
          Zoom API Setup Instructions
        </CardTitle>
        <CardDescription>
          Follow these steps to connect your Zoom account to ZoomLytics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rest of the component remains the same */}
        {/* ... */}
      </CardContent>
    </Card>
  );
};
