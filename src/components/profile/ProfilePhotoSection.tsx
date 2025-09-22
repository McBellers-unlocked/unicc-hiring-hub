import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, User, Trash2 } from "lucide-react";

interface ProfilePhotoSectionProps {
  photoUrl?: string;
  name: string;
  email: string;
  onChange: (photoUrl: string | null) => void;
}

export default function ProfilePhotoSection({ photoUrl, name, email, onChange }: ProfilePhotoSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${email.replace('@', '_')}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('application-files')
        .upload(`profile-photos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('application-files')
        .getPublicUrl(data.path);

      onChange(publicUrlData.publicUrl);

      toast({
        title: "Success",
        description: "Profile photo uploaded successfully",
      });

    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async () => {
    if (!photoUrl) return;

    try {
      setDeleting(true);

      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `profile-photos/${fileName}`;

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('application-files')
        .remove([filePath]);

      if (error) throw error;

      onChange(null);

      toast({
        title: "Success",
        description: "Profile photo removed successfully",
      });

    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={photoUrl} alt={name} />
            <AvatarFallback className="text-lg">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            
            {photoUrl && (
              <Button
                variant="outline"
                onClick={deletePhoto}
                disabled={deleting}
                className="w-full sm:w-auto text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Removing..." : "Remove Photo"}
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-sm text-muted-foreground">
          Upload a professional photo. Maximum file size: 5MB. Supported formats: JPG, PNG, WebP.
        </p>
      </CardContent>
    </Card>
  );
}