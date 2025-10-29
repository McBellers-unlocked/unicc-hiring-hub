import { useState } from "react";
import * as Diff from "diff";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineTrackChangesProps {
  fieldLabel: string;
  originalValue: string;
  newValue: string;
  showToggle?: boolean;
}

export function InlineTrackChanges({
  fieldLabel,
  originalValue,
  newValue,
  showToggle = true,
}: InlineTrackChangesProps) {
  const [showChanges, setShowChanges] = useState(true);

  // Compute word-level diff
  const diff = Diff.diffWords(originalValue || "", newValue || "");

  // Calculate statistics
  const stats = diff.reduce(
    (acc, part) => {
      const wordCount = part.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (part.added) acc.added += wordCount;
      if (part.removed) acc.removed += wordCount;
      return acc;
    },
    { added: 0, removed: 0 }
  );

  const hasChanges = stats.added > 0 || stats.removed > 0;

  if (!hasChanges) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">{fieldLabel}</label>
        <p className="whitespace-pre-wrap">{newValue}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">{fieldLabel}</label>
        {showToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChanges(!showChanges)}
            className="h-8 text-xs"
          >
            {showChanges ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Changes
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Changes
              </>
            )}
          </Button>
        )}
      </div>

      {showChanges && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="text-green-600 font-medium">+{stats.added} words</span>
          {" • "}
          <span className="text-red-600 font-medium">-{stats.removed} words</span>
        </div>
      )}

      <div className="p-3 bg-muted/30 rounded-md border">
        {showChanges ? (
          <p className="whitespace-pre-wrap leading-relaxed">
            {diff.map((part, index) => {
              if (part.added) {
                return (
                  <span
                    key={index}
                    className="bg-green-100 text-green-800 underline decoration-green-600 decoration-2"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span
                    key={index}
                    className="bg-red-100 text-red-800 line-through decoration-red-600 decoration-2"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </p>
        ) : (
          <p className="whitespace-pre-wrap">{newValue}</p>
        )}
      </div>
    </div>
  );
}

interface ChangeItem {
  field: string;
  label: string;
  originalValue: string;
  newValue: string;
  diffStats?: {
    wordsAdded: number;
    wordsRemoved: number;
    wordsModified: number;
  };
}

interface InlineTrackChangesSummaryProps {
  changes: ChangeItem[];
  title?: string;
  description?: string;
}

export function InlineTrackChangesSummary({
  changes,
  title = "Modified Fields",
  description,
}: InlineTrackChangesSummaryProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  if (changes.length === 0) {
    return null;
  }

  const toggleField = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const totalStats = changes.reduce(
    (acc, change) => {
      if (change.diffStats) {
        acc.added += change.diffStats.wordsAdded;
        acc.removed += change.diffStats.wordsRemoved;
      }
      return acc;
    },
    { added: 0, removed: 0 }
  );

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">
          {title} ({changes.length})
        </CardTitle>
        {description && (
          <CardDescription className="text-blue-700">{description}</CardDescription>
        )}
        <div className="text-sm text-blue-800 mt-2">
          Total changes: <span className="text-green-700 font-medium">+{totalStats.added} words</span>
          {" • "}
          <span className="text-red-700 font-medium">-{totalStats.removed} words</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {changes.map((change) => {
          const isExpanded = expandedFields.has(change.field);
          return (
            <div key={change.field} className="border border-blue-200 rounded-lg bg-white">
              <button
                onClick={() => toggleField(change.field)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{change.label}</span>
                  {change.diffStats && (
                    <span className="text-xs text-muted-foreground">
                      (+{change.diffStats.wordsAdded}, -{change.diffStats.wordsRemoved})
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-2">
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={change.originalValue}
                    newValue={change.newValue}
                    showToggle={false}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
