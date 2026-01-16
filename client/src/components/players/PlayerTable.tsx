import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { useTogglePlayerActive } from '@/hooks/usePlayers';
import type { Player } from '@/types';

interface PlayerTableProps {
  players: Player[];
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  canEdit?: boolean;
}

const PlayerTable = ({ players, onEdit, onDelete, canEdit = true }: PlayerTableProps) => {
  const toggleActive = useTogglePlayerActive();

  const handleToggleActive = async (player: Player) => {
    try {
      await toggleActive.mutateAsync(player.id);
    } catch (error) {
      console.error('Failed to toggle player status:', error);
    }
  };

  if (players.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No players found. Add your first player to get started!</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell className="font-medium">{player.name}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {player.isActive ? (
                  <>
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Active</span>
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inactive</span>
                  </>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {canEdit ? (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(player)}
                    disabled={toggleActive.isPending}
                  >
                    {player.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(player)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(player)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">View only</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PlayerTable;
