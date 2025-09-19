import React, { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

interface DiffViewerProps {
  fieldLabel: string;
  originalValue: string;
  newValue: string;
  showDiff?: boolean;
}

export function DiffViewer({ fieldLabel, originalValue, newValue, showDiff = true }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'diff' | 'clean'>('diff');
  const [diffType, setDiffType] = useState<'split' | 'unified'>('unified');

  // Calculate word count changes
  const originalWords = originalValue.trim().split(/\s+/).filter(word => word.length > 0);
  const newWords = newValue.trim().split(/\s+/).filter(word => word.length > 0);
  const wordChange = newWords.length - originalWords.length;

  const customStyles = {
    variables: {
      light: {
        codeFoldGutterBackground: '#f8f9fa',
        codeFoldBackground: '#f1f3f4',
        addedBackground: '#e6ffed',
        addedColor: '#24292e',
        removedBackground: '#ffeef0',
        removedColor: '#24292e',
        wordAddedBackground: '#acf2bd',
        wordRemovedBackground: '#fdb8c0',
        addedGutterBackground: '#cdffd8',
        removedGutterBackground: '#fdbcbe',
        gutterBackground: '#f7f7f7',
        gutterBackgroundDark: '#f7f7f7',
        highlightBackground: '#fffbdd',
        highlightGutterBackground: '#fff5b4',
      },
    },
    line: {
      padding: '10px 2px',
      '&:hover': {
        background: '#f7f7f7',
      },
    },
    marker: {
      fontSize: '12px',
    },
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg text-amber-800">{fieldLabel}</CardTitle>
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              {wordChange > 0 ? `+${wordChange}` : wordChange < 0 ? wordChange : '±0'} words
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'diff' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('diff')}
              className="h-8"
            >
              <Eye className="h-3 w-3 mr-1" />
              Track Changes
            </Button>
            <Button
              variant={viewMode === 'clean' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('clean')}
              className="h-8"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Clean View
            </Button>
            
            {viewMode === 'diff' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiffType(diffType === 'split' ? 'unified' : 'split')}
                className="h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {diffType === 'split' ? 'Unified' : 'Split'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'clean' ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Current Version</h4>
              <div className="p-4 bg-white border rounded-md whitespace-pre-wrap">{newValue}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-md overflow-hidden">
            <ReactDiffViewer
              oldValue={originalValue}
              newValue={newValue}
              splitView={diffType === 'split'}
              compareMethod={DiffMethod.WORDS}
              styles={customStyles}
              hideLineNumbers={true}
              showDiffOnly={false}
              leftTitle="Original"
              rightTitle="Modified"
              useDarkTheme={false}
            />
          </div>
        )}
        
        {viewMode === 'diff' && (
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded-sm"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-200 border border-red-300 rounded-sm"></div>
              <span>Removed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-sm"></div>
              <span>Modified</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DiffChange {
  field: string;
  label: string;
  originalValue: string;
  newValue: string;
}

interface DiffSummaryProps {
  changes: DiffChange[];
}

export function DiffSummary({ changes }: DiffSummaryProps) {
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  const toggleChange = (field: string) => {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedChanges(newExpanded);
  };

  const totalWordChanges = changes.reduce((total, change) => {
    const originalWords = change.originalValue.trim().split(/\s+/).filter(word => word.length > 0).length;
    const newWords = change.newValue.trim().split(/\s+/).filter(word => word.length > 0).length;
    return total + Math.abs(newWords - originalWords);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-amber-800">
          HR Modifications Summary ({changes.length} fields changed)
        </h3>
        <Badge variant="outline" className="border-amber-300 text-amber-700">
          ~{totalWordChanges} words modified
        </Badge>
      </div>
      
      <div className="space-y-3">
        {changes.map((change) => (
          <div key={change.field}>
            <Button
              variant="ghost"
              className="w-full justify-between p-3 h-auto text-left border border-amber-200 hover:bg-amber-50"
              onClick={() => toggleChange(change.field)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Modified</Badge>
                <span className="font-medium">{change.label}</span>
              </div>
              <Eye className={`h-4 w-4 transition-transform ${expandedChanges.has(change.field) ? 'rotate-180' : ''}`} />
            </Button>
            
            {expandedChanges.has(change.field) && (
              <div className="mt-2">
                <DiffViewer
                  fieldLabel={change.label}
                  originalValue={change.originalValue}
                  newValue={change.newValue}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}