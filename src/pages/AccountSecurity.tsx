import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { MFASetup } from '@/components/MFASetup';
import { useToast } from '@/hooks/use-toast';

export const AccountSecurity: React.FC = () => {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      setMfaEnabled(data?.totp?.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    setDisabling(true);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id
        });
        if (error) throw error;
      }

      setMfaEnabled(false);
      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable MFA",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    setMfaEnabled(true);
    checkMFAStatus();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (showMFASetup) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowMFASetup(false)}
          >
            ← Back to Security Settings
          </Button>
        </div>
        <MFASetup onComplete={handleMFASetupComplete} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Security</h1>
        <p className="text-muted-foreground">
          Manage your account security settings and two-factor authentication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mfaEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-600" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with TOTP authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Status</p>
              <div className="flex items-center gap-2">
                <Badge variant={mfaEnabled ? "default" : "secondary"}>
                  {mfaEnabled ? "Enabled" : "Disabled"}
                </Badge>
                {mfaEnabled && (
                  <span className="text-sm text-muted-foreground">
                    Your account is protected with 2FA
                  </span>
                )}
              </div>
            </div>

            {mfaEnabled ? (
              <Button 
                variant="destructive" 
                onClick={disableMFA}
                disabled={disabling}
              >
                {disabling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Disable 2FA
              </Button>
            ) : (
              <Button onClick={() => setShowMFASetup(true)}>
                Enable 2FA
              </Button>
            )}
          </div>

          {!mfaEnabled && (
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                Two-factor authentication is disabled. Enable it to add an extra layer of security to your account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your current account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Account ID</p>
            <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSecurity;