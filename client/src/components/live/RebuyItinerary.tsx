import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RebuyEvent } from '@/types';

interface RebuyItineraryProps {
  rebuyEvents: RebuyEvent[];
}

const RebuyItinerary = ({ rebuyEvents }: RebuyItineraryProps) => {
  if (rebuyEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5" />
            Rebuy History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No rebuys yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5" />
          Rebuy History ({rebuyEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[200px] overflow-y-auto">
          <div className="space-y-3">
            {rebuyEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{event.player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <span className="font-mono text-lg text-amber-600">
                  +${event.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RebuyItinerary;
