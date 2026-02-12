import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage system-wide configurations.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide preferences and options.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No settings available yet. Configuration options will appear here as they are added.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
