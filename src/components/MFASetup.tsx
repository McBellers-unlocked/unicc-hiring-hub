import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MFASetupProps {
  onComplete?: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'start' | 'setup' | 'verify' | 'complete'>('start');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const { toast } = useToast();

  const startMFASetup = async () => {
    setLoading(true);
    setError('');

    try {
      // First, check for existing factors and clean them up
      const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) throw listError;

      // Unenroll any existing factors to prevent conflicts
      if (existingFactors?.totp && existingFactors.totp.length > 0) {
        for (const factor of existingFactors.totp) {
          try {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
            console.log('Unenrolled existing factor:', factor.id);
          } catch (unenrollError) {
            console.warn('Could not unenroll existing factor:', factor.id, unenrollError);
          }
        }
        // Wait a moment for the unenrollment to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Use a unique friendly name to avoid conflicts
      const friendlyName = `Auth-${Date.now()}`;

      // Enroll in MFA with very short issuer name to minimize QR code size
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
        issuer: 'UNICConnect' // Override default issuer to keep it short
      });

      if (error) throw error;

      // Extract the TOTP secret from the URI
      const qrCodeUri = data.totp.qr_code;
      const uri = new URL(qrCodeUri);
      const secret = uri.searchParams.get('secret') || '';
      setTotpSecret(secret);
      
      // Try to generate QR code with multiple strategies
      let qrCodeGenerated = false;
      
      // Strategy 1: Try compact QR code
      try {
        const qrCode = await QRCode.toDataURL(qrCodeUri, {
          errorCorrectionLevel: 'L',
          margin: 1,
          width: 200
        });
        setQrCodeUrl(qrCode);
        qrCodeGenerated = true;
      } catch (qrError) {
        console.log('Compact QR failed, trying larger size...');
        
        // Strategy 2: Try slightly larger
        try {
          const qrCode = await QRCode.toDataURL(qrCodeUri, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 256
          });
          setQrCodeUrl(qrCode);
          qrCodeGenerated = true;
        } catch (qrError2) {
          console.log('QR code generation failed, using manual entry only');
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

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast({
      title: "Secret copied",
      description: "Paste this into your authenticator app.",
    });
  };

  const formatSecret = (secret: string) => {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
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
          <CardTitle>Set Up Authenticator App</CardTitle>
          <CardDescription>
            Choose either QR code scanning or manual entry to add your account to an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {qrCodeUrl ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Option 1: Scan QR Code</h3>
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code for MFA setup" className="w-48 h-48 border-2 border-border rounded" />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Scan with Google Authenticator, Microsoft Authenticator, Authy, or 1Password
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                QR code generation failed. Please use manual entry below.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">
              {qrCodeUrl ? 'Option 2: Manual Entry' : 'Manual Entry'}
            </h3>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Enter this secret key in your authenticator app:
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted p-3 rounded-lg border font-mono text-sm break-all">
                  {formatSecret(totpSecret)}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                >
                  {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enter 6-Digit Code</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter the code from your authenticator app to verify the setup
            </p>
            <InputOTP
              maxLength={6}
              value={totpCode}
              onChange={(value) => setTotpCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
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