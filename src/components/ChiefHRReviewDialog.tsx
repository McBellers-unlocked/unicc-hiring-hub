import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface ChiefHRReviewDialogProps {
  requisitionId: string;
  onComplete: () => void;
}

export function ChiefHRReviewDialog({ requisitionId }: ChiefHRReviewDialogProps) {
  const navigate = useNavigate();

  return (
    <Button 
      variant="outline" 
      size="sm"
      className="text-blue-600 border-blue-600 hover:bg-blue-50"
      onClick={() => navigate(`/requisitions/${requisitionId}/chief-hr-edit`)}
    >
      <Eye className="h-4 w-4 mr-1" />
      Review & Edit as Chief HR
    </Button>
  );
}
