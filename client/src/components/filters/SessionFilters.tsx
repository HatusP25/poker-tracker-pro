import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export interface SessionFilterValues {
  location: string;
  dateFrom: string;
  dateTo: string;
  minPot: string;
  maxPot: string;
}

interface SessionFiltersProps {
  filters: SessionFilterValues;
  onFiltersChange: (filters: SessionFilterValues) => void;
  onClear: () => void;
}

const SessionFilters = ({ filters, onFiltersChange, onClear }: SessionFiltersProps) => {
  const handleChange = (field: keyof SessionFilterValues, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Filter Sessions</CardTitle>
            <CardDescription>Narrow down your search results</CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Search */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Search by location..."
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
            />
          </div>
        </div>

        {/* Pot Size Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPot">Min Pot ($)</Label>
            <Input
              id="minPot"
              type="number"
              placeholder="0"
              value={filters.minPot}
              onChange={(e) => handleChange('minPot', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPot">Max Pot ($)</Label>
            <Input
              id="maxPot"
              type="number"
              placeholder="1000"
              value={filters.maxPot}
              onChange={(e) => handleChange('maxPot', e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="pt-2 text-sm text-muted-foreground">
            Active filters applied
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionFilters;
