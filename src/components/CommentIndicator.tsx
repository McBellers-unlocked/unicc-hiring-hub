import React from "react";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentIndicatorProps {
  totalCount: number;
  unresolvedCount: number;
  onClick: () => void;
  className?: string;
}

const CommentIndicator: React.FC<CommentIndicatorProps> = ({
  totalCount,
  unresolvedCount,
  onClick,
  className,
}) => {
  if (totalCount === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("h-7 gap-1.5 px-2", className)}
    >
      <MessageSquare className="h-4 w-4" />
      {unresolvedCount > 0 ? (
        <Badge variant="default" className="h-5 min-w-[20px] px-1 text-xs">
          {unresolvedCount}
        </Badge>
      ) : (
        <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-xs">
          {totalCount}
        </Badge>
      )}
    </Button>
  );
};

export default CommentIndicator;
