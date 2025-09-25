import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

interface MFAVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({ onSuccess, onCancel }) => {
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get enrolled factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;
      
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        throw new Error('No TOTP factor found');
      }

      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: totpCode
      });

      if (verifyError) throw verifyError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to complete sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};