import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useGroupContext } from '@/context/GroupContext';
import GroupCard from '@/components/groups/GroupCard';
import CreateGroupDialog from '@/components/groups/CreateGroupDialog';
import type { Group } from '@/types';

const GroupSelection = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: groups, isLoading } = useGroups();
  const { setSelectedGroup } = useGroupContext();
  const navigate = useNavigate();

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-muted-foreground">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Select Poker Group</CardTitle>
                <CardDescription>Choose a group to start tracking your poker sessions</CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!groups || groups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No groups yet. Create your first group to get started!</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Group
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} onClick={() => handleSelectGroup(group)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateGroupDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
};

export default GroupSelection;
