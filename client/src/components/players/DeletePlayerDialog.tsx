import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeletePlayer } from '@/hooks/usePlayers';
import type { Player } from '@/types';

interface DeletePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
}

const DeletePlayerDialog = ({ open, onOpenChange, player }: DeletePlayerDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const deletePlayer = useDeletePlayer();

  const handleDelete = async () => {
    if (!player) return;

    setError(null);
    try {
      await deletePlayer.mutateAsync(player.id);
      onOpenChange(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        setError(response?.data?.error || 'Failed to delete player');
      } else {
        setError('Failed to delete player');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Player</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {player?.name}? This action cannot be undone and will fail if the player has
            any session entries.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deletePlayer.isPending}>
            {deletePlayer.isPending ? 'Deleting...' : 'Delete Player'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePlayerDialog;
