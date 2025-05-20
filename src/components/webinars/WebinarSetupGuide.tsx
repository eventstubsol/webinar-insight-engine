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
  scopesError: boolean;
  verifyCredentials: () => Promise<boolean>;
  isVerifying: boolean;
  verified: boolean;
  verificationDetails: any;
}

export const WebinarSetupGuide: React.FC<WebinarSetupGuideProps> = ({
  scopesError,
  verifyCredentials,
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">1</span>
              Create a Server-to-Server OAuth app in Zoom Marketplace
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll need to create a Server-to-Server OAuth app in the Zoom Marketplace to get the credentials required for this integration.
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-2">
              <li>Go to <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                Zoom Marketplace <ExternalLink className="h-3 w-3" />
              </a> and sign in with your Zoom account</li>
              <li>Click on "Develop" in the top-right corner, then "Build App"</li>
              <li>Select "Server-to-Server OAuth" as the app type</li>
              <li>Give your app a name like "ZoomLytics Integration"</li>
              <li>Fill out the required information for your app</li>
              <li><span className="font-bold text-amber-700">IMPORTANT:</span> Under "Scopes", add the following scopes:
                <ul className="list-disc pl-6 mt-1">
                  <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:admin</code></li>
                  <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:master</code></li>
                  <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:read:webinar:admin</code></li>
                  <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:write:webinar:admin</code></li>
                </ul>
              </li>
              <li>Click "Continue" and proceed to activate your app</li>
              <li>Once your app is created, Zoom will provide you with:
                <ul className="list-disc pl-6 mt-1">
                  <li><strong>Account ID</strong> (from your Zoom account)</li>
                  <li><strong>Client ID</strong> (for your new app)</li>
                  <li><strong>Client Secret</strong> (for your new app)</li>
                </ul>
              </li>
            </ol>
            <div className="flex items-center justify-end">
              <Button variant="outline" className="gap-1" asChild>
                <a href="https://marketplace.zoom.us/develop/apps" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4" />
                  Go to Zoom Marketplace
                </a>
              </Button>
            </div>
          </div>
        </div>

        {scopesError && renderScopesWarning()}

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">2</span>
              Configure Supabase Edge Function Secrets
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              Add your Zoom API credentials as secrets in your Supabase project to securely connect with Zoom.
            </p>
            <Alert>
              <AlertTitle className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Important
              </AlertTitle>
              <AlertDescription className="text-sm">
                You need to add the following secrets to your Supabase Edge Functions settings for the integration to work:
              </AlertDescription>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <div className="font-mono text-sm">ZOOM_ACCOUNT_ID</div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopyToClipboard("ZOOM_ACCOUNT_ID", "Secret Name")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <div className="font-mono text-sm">ZOOM_CLIENT_ID</div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopyToClipboard("ZOOM_CLIENT_ID", "Secret Name")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <div className="font-mono text-sm">ZOOM_CLIENT_SECRET</div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopyToClipboard("ZOOM_CLIENT_SECRET", "Secret Name")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Alert>
            <div className="flex items-center justify-end">
              <Button className="gap-1" asChild>
                <a href="https://supabase.com/dashboard/project/dcvlxtkxqyaznxxvkynd/settings/functions" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4" />
                  Configure Supabase Secrets
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">3</span>
              Verify Your Connection
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              After adding your Zoom API credentials and updating the required scopes, verify the connection to start importing your webinars.
            </p>
            <Button 
              onClick={verifyCredentials} 
              disabled={isVerifying} 
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                  Verifying Connection...
                </>
              ) : verified ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Connection Verified
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Verify Connection
                </>
              )}
            </Button>
            
            {verified && (
              <div className="flex flex-col items-center mt-4 space-y-2">
                <Alert variant="success" className="bg-green-50 border-green-200 w-full">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Connection Successful!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Connected as: <span className="font-semibold">{verificationDetails?.user?.email || 'Zoom User'}</span>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {scopesError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Required OAuth Scopes</AlertTitle>
                <AlertDescription>
                  <p>Your Zoom app is missing required OAuth scopes. Please add the following scopes to your Zoom app in the Zoom Marketplace:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>user:read:user:admin</li>
                    <li>user:read:user:master</li>
                    <li>webinar:read:webinar:admin</li>
                    <li>webinar:write:webinar:admin</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-sm">4</span>
              Troubleshooting
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Check Logs for Detailed Error Messages</AlertTitle>
              <AlertDescription>
                If you're experiencing issues, check the Edge Function logs for detailed error messages that might help identify the problem.
              </AlertDescription>
              <div className="mt-3">
                <Button variant="outline" className="gap-1" asChild>
                  <a href="https://supabase.com/dashboard/project/dcvlxtkxqyaznxxvkynd/functions/zoom-api/logs" target="_blank" rel="noopener noreferrer">
                    <Info className="h-4 w-4" />
                    View Function Logs
                  </a>
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
