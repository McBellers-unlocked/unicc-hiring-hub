import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, User, Link2, Loader2, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: string;
  name: string;
  email: string;
}

interface LinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentName: string;
}

export const LinkUserDialog = ({ 
  open, 
  onOpenChange, 
  appointmentId, 
  appointmentName 
}: LinkUserDialogProps) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading: isSearching } = useQuery({
    queryKey: ['user-search', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as User[];
    },
    enabled: searchTerm.length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First get the user's email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;

      const { error } = await supabase
        .from('hr_appointments')
        .update({ 
          user_id: userId,
          email: userData.email,
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      onOpenChange(false);
      setSearchTerm('');
      setSelectedUser(null);
      toast.success('User linked successfully');
    },
    onError: (error) => {
      toast.error('Failed to link user: ' + error.message);
    },
  });

  const handleLink = () => {
    if (selectedUser) {
      linkMutation.mutate(selectedUser.id);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchTerm('');
      setSelectedUser(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to User
          </DialogTitle>
          <DialogDescription>
            Search and link <strong>{appointmentName}</strong> to an existing user in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedUser(null);
              }}
              className="pl-9"
            />
          </div>

          {searchTerm.length >= 2 && (
            <ScrollArea className="h-48 border rounded-md">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mb-2" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="p-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        {selectedUser?.id === user.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Type at least 2 characters to search
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedUser || linkMutation.isPending}
          >
            {linkMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Link User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
