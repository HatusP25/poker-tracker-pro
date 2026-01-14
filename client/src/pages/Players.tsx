import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import PlayerTable from '@/components/players/PlayerTable';
import CreatePlayerDialog from '@/components/players/CreatePlayerDialog';
import EditPlayerDialog from '@/components/players/EditPlayerDialog';
import DeletePlayerDialog from '@/components/players/DeletePlayerDialog';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import type { Player } from '@/types';

const Players = () => {
  const { selectedGroup } = useGroupContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: players, isLoading } = usePlayersByGroup(selectedGroup?.id || '');

  const handleEdit = (player: Player) => {
    setSelectedPlayer(player);
    setEditDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    setSelectedPlayer(player);
    setDeleteDialogOpen(true);
  };

  const filteredPlayers = players?.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Players</h1>
          <p className="text-muted-foreground">Manage players in {selectedGroup.name}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>View and manage all players in your group</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <PlayerTable
              players={filteredPlayers || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <CreatePlayerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groupId={selectedGroup.id}
      />

      <EditPlayerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        player={selectedPlayer}
      />

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={selectedPlayer}
      />
    </div>
  );
};

export default Players;
