import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { usePlayerStats } from '@/hooks/useStats';
import PlayerTable from '@/components/players/PlayerTable';
import CreatePlayerDialog from '@/components/players/CreatePlayerDialog';
import EditPlayerDialog from '@/components/players/EditPlayerDialog';
import DeletePlayerDialog from '@/components/players/DeletePlayerDialog';
import PlayerFilters, { type PlayerFilterValues } from '@/components/filters/PlayerFilters';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import type { Player } from '@/types';

const Players = () => {
  const { selectedGroup } = useGroupContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PlayerFilterValues>({
    name: '',
    minGames: '',
    minWinRate: '',
    maxWinRate: '',
    activeOnly: false,
  });

  const { data: players, isLoading } = usePlayersByGroup(selectedGroup?.id || '');

  // Get stats for all players to enable filtering
  const playerStats = useMemo(() => {
    const statsMap = new Map();
    players?.forEach(player => {
      // You would normally fetch this from the API, but for now we'll use a simplified approach
      statsMap.set(player.id, {
        totalGames: 0,
        winRate: 0,
      });
    });
    return statsMap;
  }, [players]);

  const handleEdit = (player: Player) => {
    setSelectedPlayer(player);
    setEditDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    setSelectedPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      minGames: '',
      minWinRate: '',
      maxWinRate: '',
      activeOnly: false,
    });
    setSearchQuery('');
  };

  // Apply filters to players
  const filteredPlayers = useMemo(() => {
    if (!players) return [];

    return players.filter((player) => {
      // Name search (from search bar or filters)
      const nameQuery = searchQuery || filters.name;
      if (nameQuery && !player.name.toLowerCase().includes(nameQuery.toLowerCase())) {
        return false;
      }

      // Active only filter
      if (filters.activeOnly && !player.isActive) {
        return false;
      }

      // Note: Min games and win rate filters would need player stats from the API
      // For now, we'll skip these since they require additional data fetching
      // In a full implementation, you'd fetch stats for each player

      return true;
    });
  }, [players, searchQuery, filters]);

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Players</h1>
          <p className="text-muted-foreground">
            Manage players in {selectedGroup.name}
            {filteredPlayers.length !== players?.length && ` (${filteredPlayers.length} of ${players?.length})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <PlayerFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClear={handleClearFilters}
        />
      )}

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
