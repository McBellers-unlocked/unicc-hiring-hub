import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  grade?: string;
  job_title?: string;
  duty_station?: string;
  section_unit?: string;
  supervisor?: string;
  staff_number?: string;
  is_international: boolean;
}

interface StaffSearchComboboxProps {
  onSelect: (staff: StaffMember) => void;
  selectedStaffId?: string | null;
  disabled?: boolean;
}

// Parse name into first and last name
// Handles formats like "Szilvia PETKOV" or "AGUILAR RICO Enrique"
export const parseName = (name: string): { firstName: string; lastName: string } => {
  if (!name) return { firstName: '', lastName: '' };
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    return { firstName: '', lastName: words[0] };
  }
  
  // Find uppercase words (likely last name)
  const upperWords: string[] = [];
  const lowerWords: string[] = [];
  
  words.forEach(word => {
    // Check if word is all uppercase (allowing for accented chars)
    if (word === word.toUpperCase() && word.length > 1) {
      upperWords.push(word);
    } else {
      lowerWords.push(word);
    }
  });
  
  // If we have uppercase words, they're likely the last name
  if (upperWords.length > 0 && lowerWords.length > 0) {
    return {
      firstName: lowerWords.join(' '),
      lastName: upperWords.join(' '),
    };
  }
  
  // Fallback: first word is first name, rest is last name
  return {
    firstName: words[0],
    lastName: words.slice(1).join(' '),
  };
};

// Determine if staff is international based on grade
export const isInternationalGrade = (grade?: string): boolean => {
  if (!grade) return false;
  const upperGrade = grade.toUpperCase();
  return upperGrade.startsWith('P') || upperGrade.startsWith('D') || upperGrade.startsWith('USG') || upperGrade.startsWith('ASG');
};

export const StaffSearchCombobox = ({
  onSelect,
  selectedStaffId,
  disabled,
}: StaffSearchComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Debounced search
  const searchStaff = useCallback(async (query: string) => {
    if (query.length < 2) {
      setStaff([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, current_grade, job_title, duty_station, unit, line_manager, staff_number')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      const mapped: StaffMember[] = (data || []).map(user => ({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        grade: user.current_grade || undefined,
        job_title: user.job_title || undefined,
        duty_station: user.duty_station || undefined,
        section_unit: user.unit || undefined,
        supervisor: user.line_manager || undefined,
        staff_number: user.staff_number || undefined,
        is_international: isInternationalGrade(user.current_grade),
      }));

      setStaff(mapped);
    } catch (error) {
      console.error('Error searching staff:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchStaff(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchStaff]);

  const handleSelect = (staffMember: StaffMember) => {
    setSelectedName(staffMember.name);
    onSelect(staffMember);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            {selectedName ? (
              <span className="truncate">{selectedName}</span>
            ) : (
              <span className="text-muted-foreground">Search existing staff...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type name or email to search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : search.length < 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : staff.length === 0 ? (
              <CommandEmpty>No staff found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Staff Members">
                {staff.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.id}
                    onSelect={() => handleSelect(member)}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{member.name}</span>
                      {member.grade && (
                        <Badge variant={member.is_international ? 'default' : 'secondary'} className="ml-auto text-xs">
                          {member.grade}
                        </Badge>
                      )}
                      {selectedStaffId === member.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
                      {member.job_title && <div>{member.job_title}</div>}
                      <div className="flex gap-2">
                        {member.section_unit && <span>{member.section_unit}</span>}
                        {member.duty_station && <span>• {member.duty_station}</span>}
                      </div>
                      <div>{member.email}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
