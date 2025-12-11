import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { UNICCLogo } from '@/components/UNICCLogo';

export default function MyProfile() {
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findOrCreateProfile = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Check if user is staff (non-Candidate role) - they shouldn't create candidate profiles
        const isStaff = userRoles.some(role => 
          ['Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Panel Member', 'Director', 'Chief of Division', 'Deputy Director'].includes(role)
        );

        if (isStaff) {
          // Staff users - redirect to dashboard or show message
          // They appear in Talent Pool via the users table, not candidates
          navigate('/');
          return;
        }

        // Only for actual Candidate role users - check if candidate profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('candidates')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingProfile?.id) {
          // Profile exists, redirect to view page
          navigate(`/candidate-profile/${existingProfile.id}`);
        } else {
          // No profile, create one
          const { data: newProfile, error: insertError } = await supabase
            .from('candidates')
            .insert({
              email: user.email,
              name: user.user_metadata?.name || user.email.split('@')[0],
              profile_completion_percentage: 0
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          if (newProfile?.id) {
            // Redirect to edit page for new profile
            navigate(`/candidate-profile/${newProfile.id}/edit`);
          }
        }
      } catch (error) {
        console.error('Error finding/creating profile:', error);
        // If there's an error, try to navigate to the edit page without ID
        navigate('/candidate-profile/edit');
      } finally {
        setLoading(false);
      }
    };

    findOrCreateProfile();
  }, [user, userRoles, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <UNICCLogo size="md" className="text-primary mx-auto mb-4" />
            <p>Loading your profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
