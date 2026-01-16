import { useNavigate } from 'react-router-dom';
import { useGroupContext } from '@/context/GroupContext';
import SessionForm from '@/components/sessions/SessionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, FileText } from 'lucide-react';

const DataEntry = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Show success message or navigate to sessions page
    navigate('/sessions');
  };

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Session</h1>
        <p className="text-muted-foreground">Choose how to record your poker session</p>
      </div>

      {/* Session Type Selector */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/live/start')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Live Session Tracking
            </CardTitle>
            <CardDescription>
              Start a live game and track rebuys in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Real-time timer and standings</li>
              <li>• Add rebuys during gameplay</li>
              <li>• Automatic settlement calculator</li>
              <li>• Perfect for active games</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Traditional Entry
            </CardTitle>
            <CardDescription>
              Enter session details after the game ends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Quick entry for completed games</li>
              <li>• All data at once</li>
              <li>• Best for historical data</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Traditional Form */}
      <SessionForm
        groupId={selectedGroup.id}
        defaultBuyIn={selectedGroup.defaultBuyIn}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default DataEntry;
