import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePlayer } from '@/hooks/usePlayers';
import type { Player } from '@/types';

const editPlayerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type EditPlayerForm = z.infer<typeof editPlayerSchema>;

interface EditPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
}

const EditPlayerDialog = ({ open, onOpenChange, player }: EditPlayerDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const updatePlayer = useUpdatePlayer();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditPlayerForm>({
    resolver: zodResolver(editPlayerSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (player) {
      reset({
        name: player.name,
        avatarUrl: player.avatarUrl || '',
      });
    }
  }, [player, reset]);

  const onSubmit = async (data: EditPlayerForm) => {
    if (!player) return;

    setError(null);
    try {
      await updatePlayer.mutateAsync({
        id: player.id,
        data: {
          name: data.name,
          avatarUrl: data.avatarUrl || undefined,
        },
      });
      onOpenChange(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        setError(response?.data?.error || 'Failed to update player');
      } else {
        setError('Failed to update player');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Player</DialogTitle>
          <DialogDescription>Update player information.</DialogDescription>
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
            <Button type="submit" disabled={updatePlayer.isPending}>
              {updatePlayer.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPlayerDialog;
