import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePlayer } from '@/hooks/usePlayers';

const createPlayerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type CreatePlayerForm = z.infer<typeof createPlayerSchema>;

interface CreatePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const CreatePlayerDialog = ({ open, onOpenChange, groupId }: CreatePlayerDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const createPlayer = useCreatePlayer();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePlayerForm>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  const onSubmit = async (data: CreatePlayerForm) => {
    setError(null);
    try {
      await createPlayer.mutateAsync({
        groupId,
        name: data.name,
        avatarUrl: data.avatarUrl || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        setError(response?.data?.error || 'Failed to create player');
      } else {
        setError('Failed to create player');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
          <DialogDescription>Add a new player to your poker group.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Player Name</Label>
              <Input id="name" placeholder="John Doe" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
              <Input id="avatarUrl" type="url" placeholder="https://..." {...register('avatarUrl')} />
              {errors.avatarUrl && <p className="text-sm text-destructive">{errors.avatarUrl.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPlayer.isPending}>
              {createPlayer.isPending ? 'Adding...' : 'Add Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlayerDialog;
