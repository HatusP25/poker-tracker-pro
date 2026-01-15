import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateSession } from '@/hooks/useSessions';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useCreateTemplate } from '@/hooks/useTemplates';
import EntryRow from './EntryRow';
import BalanceIndicator from './BalanceIndicator';
import QuickEntryButtons from './QuickEntryButtons';
import TemplateSelector from '@/components/templates/TemplateSelector';
import SaveTemplateDialog from '@/components/templates/SaveTemplateDialog';
import type { Player, SessionTemplate } from '@/types';

const sessionSchema = z.object({
  date: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, 'Date cannot be in the future'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  groupId: string;
  defaultBuyIn: number;
  onSuccess?: () => void;
}

interface EntryState {
  id: string;
  playerId: string;
  buyIn: number;
  cashOut: number;
}

const SessionForm = ({ groupId, defaultBuyIn, onSuccess }: SessionFormProps) => {
  const [entries, setEntries] = useState<EntryState[]>([
    { id: '1', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
    { id: '2', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
  ]);
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);

  const { data: players = [] } = usePlayersByGroup(groupId);
  const createSession = useCreateSession();
  const createTemplate = useCreateTemplate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      location: '',
      notes: '',
    },
  });

  const quickAmounts = [5, 10, 15, 20, 25, 30];

  const addEntry = () => {
    setEntries([
      ...entries,
      { id: Date.now().toString(), playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
    ]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 2) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const duplicateEntry = (index: number) => {
    const entry = entries[index];
    setEntries([
      ...entries,
      {
        id: Date.now().toString(),
        playerId: entry.playerId,
        buyIn: entry.buyIn,
        cashOut: 0,
      },
    ]);
  };

  const updateEntry = (id: string, field: keyof EntryState, value: string | number) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const applyQuickAmount = (amount: number) => {
    if (activeEntryIndex !== null) {
      const entry = entries[activeEntryIndex];
      updateEntry(entry.id, 'buyIn', amount);
    }
  };

  const totalBuyIn = entries.reduce((sum, e) => sum + (e.buyIn || 0), 0);
  const totalCashOut = entries.reduce((sum, e) => sum + (e.cashOut || 0), 0);

  const handleLoadTemplate = (template: SessionTemplate) => {
    const playerIds = JSON.parse(template.playerIds) as string[];

    // Update form fields
    if (template.location) {
      reset({ ...control._formValues, location: template.location });
    }
    if (template.defaultTime) {
      reset({ ...control._formValues, startTime: template.defaultTime });
    }

    // Update entries with template players
    const newEntries: EntryState[] = playerIds.map((playerId, index) => ({
      id: (index + 1).toString(),
      playerId,
      buyIn: defaultBuyIn,
      cashOut: 0,
    }));

    setEntries(newEntries);
    setError(null);
  };

  const handleSaveTemplate = (name: string) => {
    const validEntries = entries.filter(e => e.playerId);
    const formValues = control._formValues;

    createTemplate.mutate({
      groupId,
      name,
      location: formValues.location || undefined,
      defaultTime: formValues.startTime || undefined,
      playerIds: validEntries.map(e => e.playerId),
    });
  };

  const onSubmit = async (data: SessionFormData) => {
    setError(null);

    // Validate entries
    const validEntries = entries.filter((e) => e.playerId && e.buyIn > 0);
    if (validEntries.length < 2) {
      setError('At least 2 players with valid entries are required');
      return;
    }

    // Check for duplicate players
    const playerIds = validEntries.map((e) => e.playerId);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      setError('Duplicate players are not allowed in the same session');
      return;
    }

    createSession.mutate({
      groupId,
      date: data.date,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      entries: validEntries.map((e) => ({
        playerId: e.playerId,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      })),
    }, {
      onSuccess: () => {
        // Reset form
        reset();
        setEntries([
          { id: '1', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
          { id: '2', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
        ]);

        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (err: unknown) => {
        if (err && typeof err === 'object' && 'response' in err) {
          const response = (err as { response?: { data?: { error?: string } } }).response;
          setError(response?.data?.error || 'Failed to create session');
        } else {
          setError('Failed to create session');
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Template Selector */}
      <TemplateSelector
        groupId={groupId}
        onLoadTemplate={handleLoadTemplate}
        onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
        currentFormData={{
          location: control._formValues.location,
          startTime: control._formValues.startTime,
          playerIds: entries.filter(e => e.playerId).map(e => e.playerId),
        }}
      />

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>Enter the basic information about the poker session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Home, Casino, etc." {...register('location')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              placeholder="Any additional notes about this session..."
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Player Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Player Entries</CardTitle>
          <CardDescription>Add player buy-ins and cash-outs for this session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Entry Buttons */}
          <div className="space-y-2">
            <Label>Quick Buy-In Amounts {activeEntryIndex !== null && '(click to apply)'}</Label>
            <QuickEntryButtons amounts={quickAmounts} onAmountClick={applyQuickAmount} />
          </div>

          {/* Entry Headers */}
          <div className="hidden sm:grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1 sm:gap-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-3 sm:col-span-3 lg:col-span-4">Player</div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">Buy-In</div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">Cash-Out</div>
            <div className="hidden lg:block lg:col-span-1 text-right">Profit</div>
            <div className="hidden lg:block lg:col-span-1 text-center">Rebuys</div>
            <div className="col-span-1 sm:col-span-1 lg:col-span-2 text-right">Actions</div>
          </div>

          {/* Entry Rows */}
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                onClick={() => setActiveEntryIndex(index)}
                className={`p-2 rounded-md transition-colors ${
                  activeEntryIndex === index ? 'bg-accent' : ''
                }`}
              >
                <EntryRow
                  index={index}
                  players={players}
                  selectedPlayerId={entry.playerId}
                  buyIn={entry.buyIn}
                  cashOut={entry.cashOut}
                  defaultBuyIn={defaultBuyIn}
                  onPlayerChange={(playerId) => updateEntry(entry.id, 'playerId', playerId)}
                  onBuyInChange={(value) => updateEntry(entry.id, 'buyIn', value)}
                  onCashOutChange={(value) => updateEntry(entry.id, 'cashOut', value)}
                  onRemove={() => removeEntry(entry.id)}
                  onDuplicate={() => duplicateEntry(index)}
                  showDuplicate={true}
                />
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addEntry} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>

          {/* Balance Indicator */}
          <BalanceIndicator totalBuyIn={totalBuyIn} totalCashOut={totalCashOut} threshold={1} />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset();
            setEntries([
              { id: '1', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
              { id: '2', playerId: '', buyIn: defaultBuyIn, cashOut: 0 },
            ]);
            setError(null);
          }}
        >
          Reset
        </Button>
        <Button type="submit" disabled={createSession.isPending}>
          {createSession.isPending ? 'Creating Session...' : 'Create Session'}
        </Button>
      </div>

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={saveTemplateDialogOpen}
        onOpenChange={setSaveTemplateDialogOpen}
        onSave={handleSaveTemplate}
      />
    </form>
  );
};

export default SessionForm;
