import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { SessionHighlights } from '@/types';

interface SessionHighlightsSectionProps {
  highlights: SessionHighlights;
}

const SessionHighlightsSection = ({ highlights }: SessionHighlightsSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Session Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Biggest Winner */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="text-3xl">🥇</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Biggest Winner</p>
              <p className="font-semibold">{highlights.biggestWinner.name}</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                +${highlights.biggestWinner.profit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Biggest Loser */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="text-3xl">😔</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Biggest Loser</p>
              <p className="font-semibold">{highlights.biggestLoser.name}</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                ${highlights.biggestLoser.profit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Most Rebuys (if exists) */}
          {highlights.mostRebuys && (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <div className="text-3xl">🔄</div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Most Rebuys</p>
                <p className="font-semibold">{highlights.mostRebuys.name}</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {highlights.mostRebuys.rebuys} {highlights.mostRebuys.rebuys === 1 ? 'rebuy' : 'rebuys'}
                </p>
              </div>
            </div>
          )}

          {/* Biggest Comeback (if exists) */}
          {highlights.biggestComeback && (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="text-3xl">📈</div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Biggest Comeback</p>
                <p className="font-semibold">{highlights.biggestComeback.name}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {highlights.biggestComeback.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionHighlightsSection;
