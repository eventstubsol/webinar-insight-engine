
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, Filter, ChevronDown } from 'lucide-react';

interface WebinarFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDateFilterChange?: (date: Date | undefined) => void;
}

export const WebinarFilters: React.FC<WebinarFiltersProps> = ({
  searchQuery,
  onSearchChange,
  onDateFilterChange
}) => {
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (onDateFilterChange) {
      onDateFilterChange(selectedDate);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search webinars..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {date ? format(date, 'MMM d, yyyy') : 'Filter by date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <Button variant="outline" className="flex items-center gap-1">
          <Filter className="h-4 w-4 mr-1" />
          Advanced Filters
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
