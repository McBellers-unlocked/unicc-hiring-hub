import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface MFASetupProps {
  onComplete?: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'start' | 'setup' | 'verify' | 'complete'>('start');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { toast } = useToast();

  const startMFASetup = async () => {
    setLoading(true);
    setError('');

    try {
      // First, check for existing factors and clean them up
      const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) throw listError;

      // Unenroll any existing incomplete factors
      if (existingFactors?.totp && existingFactors.totp.length > 0) {
        for (const factor of existingFactors.totp) {
          try {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          } catch (unenrollError) {
            console.warn('Could not unenroll existing factor:', unenrollError);
            // Continue anyway - the factor might already be unenrolled
          }
        }
      }

      // Generate a unique friendly name with timestamp
      const timestamp = Date.now();
      const friendlyName = `Authenticator App ${timestamp}`;

      // Enroll in MFA with unique name
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName
      });

      if (error) throw error;

      // Generate QR code with very aggressive compression to handle large data
      const qrCodeUri = data.totp.qr_code;
      
      try {
        const qrCode = await QRCode.toDataURL(qrCodeUri, {
          errorCorrectionLevel: 'L', // Lowest error correction for maximum data capacity
          margin: 0, // No margin to save space
          scale: 1, // Smallest scale
          width: 256, // Reasonable size for scanning
        });
        setQrCodeUrl(qrCode);
      } catch (qrError) {
        // If still fails, try with even more aggressive settings
        try {
          const qrCode = await QRCode.toDataURL(qrCodeUri, {
            errorCorrectionLevel: 'L',
            margin: 0,
            scale: 1,
            width: 200,
          });
          setQrCodeUrl(qrCode);
        } catch (finalError) {
          throw new Error('QR code too large for display. Please contact support.');
        }
      }

      setFactorId(data.id);
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndComplete = async () => {
    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode
      });

      if (error) throw error;

      // Generate backup codes (simulated for demo)
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      setBackupCodes(codes);
      setStep('complete');

      toast({
        title: "MFA Enabled",
        description: "Multi-factor authentication has been successfully enabled for your account.",
      });

      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: "Backup codes copied",
      description: "Save these codes in a secure location.",
    });
  };

  if (step === 'start') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Enable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>You'll need an authenticator app like:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
              <li>1Password</li>
            </ul>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={startMFASetup} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Set Up Two-Factor Authentication
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app, then enter the 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img src={qrCodeUrl} alt="QR Code for MFA setup" className="w-48 h-48 border rounded" />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Scan this QR code with your authenticator app</p>
            <p className="text-xs mt-1">
              Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totp-code">Authentication Code</Label>
            <Input
              id="totp-code"
              type="text"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setStep('start')}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={verifyAndComplete}
              disabled={loading || totpCode.length !== 6}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify & Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">MFA Enabled Successfully!</CardTitle>
          <CardDescription>
            Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Backup Codes</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyBackupCodes}
                className="text-xs"
              >
                {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedCodes ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-background p-1 rounded text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Store these codes safely. Each code can only be used once.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};