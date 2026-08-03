import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { useSeasons, useCreateSeason, useDeleteSeason } from '@/hooks/useSeasons';
import { formatLocalDate } from '@/lib/dateUtils';

interface SeasonManagerProps {
  groupId: string;
  canEdit: boolean;
}

/**
 * Define the stretches of play a group thinks in. Poker Wrapped and the season
 * picker read from these; a group with none keeps falling back to calendar years.
 */
const SeasonManager = ({ groupId, canEdit }: SeasonManagerProps) => {
  const { data: seasons = [], isLoading } = useSeasons(groupId);
  const createSeason = useCreateSeason();
  const deleteSeason = useDeleteSeason();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canSubmit = name.trim().length >= 2 && !!startDate && !!endDate;

  const handleCreate = async () => {
    if (!canSubmit) return;
    await createSeason.mutateAsync(
      { groupId, name: name.trim(), startDate, endDate },
      {
        onSuccess: () => {
          setName('');
          setStartDate('');
          setEndDate('');
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5" />
          Seasons
        </CardTitle>
        <CardDescription>
          Group your nights into seasons. Poker Wrapped can then recap a season instead of a
          calendar year. With no seasons defined, nothing changes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : seasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No seasons yet — Poker Wrapped is showing calendar years.
            </p>
          ) : (
            seasons.map((season) => (
              <div
                key={season.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                data-testid={`season-${season.name}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{season.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatLocalDate(season.startDate, 'MMM dd, yyyy')} –{' '}
                    {formatLocalDate(season.endDate, 'MMM dd, yyyy')}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${season.name}`}
                    onClick={() => deleteSeason.mutate({ id: season.id, groupId })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {canEdit && (
          <div className="space-y-3 border-t pt-4">
            <Label>Add a season</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Season 3"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                aria-label="Season name"
              />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Season start"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Season end"
              />
            </div>
            <Button onClick={handleCreate} disabled={!canSubmit || createSeason.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add season
            </Button>
            <p className="text-xs text-muted-foreground">
              Both dates are included. Seasons can't overlap — a night has to belong to just one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeasonManager;
