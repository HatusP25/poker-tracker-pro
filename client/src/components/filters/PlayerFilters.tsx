import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

export interface PlayerFilterValues {
  name: string;
  minGames: string;
  minWinRate: string;
  maxWinRate: string;
  activeOnly: boolean;
}

interface PlayerFiltersProps {
  filters: PlayerFilterValues;
  onFiltersChange: (filters: PlayerFilterValues) => void;
  onClear: () => void;
}

const PlayerFilters = ({ filters, onFiltersChange, onClear }: PlayerFiltersProps) => {
  const handleChange = (field: keyof PlayerFilterValues, value: string | boolean) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const hasActiveFilters =
    filters.name !== '' ||
    filters.minGames !== '' ||
    filters.minWinRate !== '' ||
    filters.maxWinRate !== '' ||
    filters.activeOnly;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Filter Players</CardTitle>
            <CardDescription>Find specific players</CardDescription>
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
        {/* Name Search */}
        <div className="space-y-2">
          <Label htmlFor="playerName">Player Name</Label>
          <Input
            id="playerName"
            placeholder="Search by name..."
            value={filters.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        {/* Min Games */}
        <div className="space-y-2">
          <Label htmlFor="minGames">Minimum Games Played</Label>
          <Input
            id="minGames"
            type="number"
            placeholder="0"
            value={filters.minGames}
            onChange={(e) => handleChange('minGames', e.target.value)}
          />
        </div>

        {/* Win Rate Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minWinRate">Min Win Rate (%)</Label>
            <Input
              id="minWinRate"
              type="number"
              placeholder="0"
              min="0"
              max="100"
              value={filters.minWinRate}
              onChange={(e) => handleChange('minWinRate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxWinRate">Max Win Rate (%)</Label>
            <Input
              id="maxWinRate"
              type="number"
              placeholder="100"
              min="0"
              max="100"
              value={filters.maxWinRate}
              onChange={(e) => handleChange('maxWinRate', e.target.value)}
            />
          </div>
        </div>

        {/* Active Only */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="activeOnly"
            checked={filters.activeOnly}
            onCheckedChange={(checked) => handleChange('activeOnly', checked === true)}
          />
          <Label htmlFor="activeOnly" className="cursor-pointer">
            Show active players only
          </Label>
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

export default PlayerFilters;
