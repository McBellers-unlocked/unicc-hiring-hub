import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MyApplicationsContent from '@/components/dashboard/MyApplicationsContent';

export default function MyApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          </div>
          
          {user && (
            <Button 
              onClick={() => navigate('/candidate-profile/edit')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <MyApplicationsContent />
      </div>
    </div>
  );
}