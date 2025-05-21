
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
import { Label } from '@/components/ui/label';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface WebinarFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const WebinarFilters: React.FC<WebinarFiltersProps> = ({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // If no date is selected yet or both dates are selected, start a new range
    if (!dateRange.from || (dateRange.from && dateRange.to)) {
      onDateRangeChange({ from: date, to: undefined });
      return;
    }
    
    // If start date is selected but no end date, set the end date
    // Make sure end date is not before start date
    if (date < dateRange.from) {
      onDateRangeChange({ from: date, to: dateRange.from });
    } else {
      onDateRangeChange({ from: dateRange.from, to: date });
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from) return 'Filter by date range';
    if (!dateRange.to) return `From ${format(dateRange.from, 'MMM d, yyyy')}`;
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

  const clearDateRange = () => {
    onDateRangeChange({ from: undefined, to: undefined });
    setIsCalendarOpen(false);
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
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <div className="flex flex-col space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Select Date Range</h4>
                  {(dateRange.from || dateRange.to) && (
                    <Button variant="ghost" size="sm" onClick={clearDateRange}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <p>Select the start date and then the end date</p>
                </div>
              </div>
              <Calendar
                mode="single"
                selected={dateRange.to || dateRange.from}
                onSelect={handleSelect}
                initialFocus
                className="pointer-events-auto"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
                  <div id="from" className="p-2 border rounded-md">
                    {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
                  </div>
                </div>
                <div>
                  <Label htmlFor="to" className="text-xs text-muted-foreground">To</Label>
                  <div id="to" className="p-2 border rounded-md">
                    {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
                  </div>
                </div>
              </div>
            </div>
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
