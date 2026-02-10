import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { UNICCLogo } from '@/components/UNICCLogo';
import { MFAVerification } from '@/components/MFAVerification';

export default function Auth() {
  const { user, signIn, signUp, loading, mfaRequired, clearMfaRequired } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSendingReset(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('reset-email') as string;
    const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetEmailSent(true);
    }
    setIsSendingReset(false);
  };

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningIn(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error, mfaRequired: needsMfa } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } else if (!needsMfa) {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
    }
    // If MFA is required, the component will show the MFA verification UI
    
    setIsSigningIn(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningUp(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    const { error } = await signUp(email, password, firstName, lastName);
    
    if (error) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }
    
    setIsSigningUp(false);
  };

  const handleMfaSuccess = () => {
    clearMfaRequired();
    toast({
      title: "Welcome back!",
      description: "You have been signed in successfully.",
    });
  };

  const handleMfaCancel = () => {
    clearMfaRequired();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UNICCLogo size="md" className="text-primary mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show MFA verification if required
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <UNICCLogo size="lg" className="text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold">UNICConnect</h1>
            <p className="text-muted-foreground mt-2">Complete your sign in</p>
          </div>
          
          <MFAVerification 
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <UNICCLogo size="lg" className="text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">UNICConnect</h1>
          <p className="text-muted-foreground mt-2">Access your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in to your existing account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {showForgotPassword ? (
                  resetEmailSent ? (
                    <div className="space-y-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        If an account exists with that email, you'll receive a password reset link shortly.
                      </p>
                      <Button
                        variant="link"
                        className="w-full"
                        onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                      >
                        Back to Sign In
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          name="reset-email"
                          type="email"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSendingReset}>
                        {isSendingReset ? "Sending..." : "Send Reset Link"}
                      </Button>
                      <Button
                        variant="link"
                        className="w-full"
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Back to Sign In
                      </Button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSigningIn}>
                      {isSigningIn ? "Signing In..." : "Sign In"}
                    </Button>
                    <Button
                      variant="link"
                      className="w-full"
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot Password?
                    </Button>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}