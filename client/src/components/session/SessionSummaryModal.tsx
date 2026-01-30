import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import { parseLocalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';
import RankingChangesSection from './RankingChangesSection';
import SessionHighlightsSection from './SessionHighlightsSection';
import StreaksSection from './StreaksSection';

interface SessionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  groupId: string;
  onViewSettlement: () => void;
  onClose: () => void;
}

const SessionSummaryModal = ({
  open,
  onOpenChange,
  sessionId,
  groupId,
  onViewSettlement,
  onClose,
}: SessionSummaryModalProps) => {
  const { data: summary, isLoading, error } = useSessionSummary(
    sessionId || '',
    groupId
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-destructive">Error loading session summary</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : summary ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Session Complete! 🎉</DialogTitle>
              <DialogDescription className="text-base">
                {format(parseLocalDate(summary.session.date), 'MMMM dd, yyyy')} •{' '}
                {summary.session.playerCount} {summary.session.playerCount === 1 ? 'player' : 'players'} •{' '}
                ${summary.session.totalPot.toFixed(2)} pot
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-4">
              {/* Ranking Changes */}
              <RankingChangesSection changes={summary.rankingChanges} />

              {/* Session Highlights */}
              <SessionHighlightsSection highlights={summary.highlights} />

              {/* Streaks & Milestones */}
              <StreaksSection streaks={summary.streaks} milestones={summary.milestones} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
              <Button onClick={onViewSettlement}>
                View Settlement →
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SessionSummaryModal;
