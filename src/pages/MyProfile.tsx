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
        // Check if user is staff (non-Candidate role) - they get Internal candidate type
        const isStaff = userRoles.some(role => 
          ['Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Panel Member', 'Director', 'Chief of Division', 'Deputy Director'].includes(role)
        );

        // Check if candidate profile exists for this email
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
          // For staff, fetch actual name from users table (not user_metadata which contains role)
          let profileName = user.user_metadata?.name || user.email.split('@')[0];
          
          if (isStaff) {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('email', user.email)
              .maybeSingle();
            
            if (userData?.name) {
              profileName = userData.name;
            }
          }

          // No profile, create one with appropriate candidate_type
          const { data: newProfile, error: insertError } = await supabase
            .from('candidates')
            .insert({
              email: user.email,
              name: profileName,
              candidate_type: isStaff ? 'Internal' : 'External',
              un_experience: isStaff ? true : false,
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
