import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: string[];
  userName: string | null;
  loading: boolean;
  needsProfileSetup: boolean;
  mfaRequired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; mfaRequired?: boolean }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearMfaRequired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const getUserRolesForProfile = (role: string | null | undefined, email: string | null | undefined): string[] => {
    const roles: string[] = [];
    if (role) {
      roles.push(role);
    }

    const chiefDivisionEmails = [
      'grecuccio@unicc.org', // Milena
      'liuzzi@unicc.org',    // Marco
      'sethi@unicc.org',     // Anish
      'soni@unicc.org',      // Tima
    ];

    if (email && chiefDivisionEmails.includes(email.toLowerCase()) && !roles.includes('Chief of Division')) {
      roles.push('Chief of Division');
    }

    const localAdminEmails = ['ruiz@unicc.org', 'requeni@unicc.org'];
    if (email && localAdminEmails.includes(email.toLowerCase()) && !roles.includes('Local Admin')) {
      roles.push('Local Admin');
    }

    return roles;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching with setTimeout to prevent recursion
          setTimeout(async () => {
            try {
              const { data: userProfile } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', session.user.id)
                .single();
              
              setUserRoles(getUserRolesForProfile(userProfile?.role, session.user.email));
              setUserName(userProfile?.name || null);
              
              // Check if candidate needs profile setup
              if (userProfile?.role === 'Candidate') {
                const { data: candidateProfile } = await supabase
                  .from('candidates')
                  .select('name, email, professional_summary, profile_completion_percentage')
                  .eq('email', session.user.email)
                  .single();
                
                // Consider profile incomplete if basic info is missing or completion is very low
                const isIncomplete = !candidateProfile || 
                  !candidateProfile.name || 
                  !candidateProfile.professional_summary ||
                  (candidateProfile.profile_completion_percentage || 0) < 20;
                
                setNeedsProfileSetup(isIncomplete);
              } else {
                setNeedsProfileSetup(false);
              }
            } catch (error) {
              console.error('Error fetching user role:', error);
              setUserRoles([]);
              setUserName(null);
              setNeedsProfileSetup(false);
            }
          }, 0);
        } else {
          setUserRoles([]);
          setUserName(null);
          setNeedsProfileSetup(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: userProfile } = await supabase
              .from('users')
              .select('role, name')
              .eq('id', session.user.id)
              .single();
            
            setUserRoles(getUserRolesForProfile(userProfile?.role, session.user.email));
            setUserName(userProfile?.name || null);
            
            // Check if candidate needs profile setup
            if (userProfile?.role === 'Candidate') {
              const { data: candidateProfile } = await supabase
                .from('candidates')
                .select('name, email, professional_summary, profile_completion_percentage')
                .eq('email', session.user.email)
                .single();
              
              // Consider profile incomplete if basic info is missing or completion is very low
              const isIncomplete = !candidateProfile || 
                !candidateProfile.name || 
                !candidateProfile.professional_summary ||
                (candidateProfile.profile_completion_percentage || 0) < 20;
              
              setNeedsProfileSetup(isIncomplete);
            } else {
              setNeedsProfileSetup(false);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRoles([]);
            setUserName(null);
            setNeedsProfileSetup(false);
          }
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if MFA is required
        if (error.message?.includes('MFA') || error.message?.includes('factor')) {
          setMfaRequired(true);
          return { error: null, mfaRequired: true };
        }
        return { error };
      }

      // Check if user has MFA enabled but wasn't challenged
      if (data.user && data.session) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors?.totp?.length > 0) {
          // User has MFA but wasn't challenged, which means they need to verify
          setMfaRequired(true);
          return { error: null, mfaRequired: true };
        }
      }

      setMfaRequired(false);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const clearMfaRequired = () => {
    setMfaRequired(false);
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setUserName(null);
      setNeedsProfileSetup(false);
      setMfaRequired(false);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const value = {
    user,
    session,
    userRoles,
    userName,
    loading,
    needsProfileSetup,
    mfaRequired,
    signIn,
    signUp,
    signOut,
    clearMfaRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};