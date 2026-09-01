import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, MapPin, Users } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import { useBelt } from '@/hooks/useInsights';
import { useRole } from '@/context/RoleContext';
import type { Settlement } from '@/types';
import { parseLocalDate } from '@/lib/dateUtils';
import { rebuyCountsByPlayer } from '@/lib/nightRebuys';
import { formatCount, formatMoney } from '@/lib/viz';
import { formatNightMessage } from '@/lib/nightMessage';
import { buildNightShareInput, nightCardFilename } from '@/lib/nightShareData';
import { buildNightCardScene } from '@/lib/shareCard';
import { displayName } from '@/lib/displayName';
import ShareCardButton from '@/components/share/ShareCardButton';
import NightHeadline from '@/components/session/NightHeadline';
import NightResultsBoard from '@/components/session/NightResultsBoard';
import NightStory from '@/components/session/NightStory';
import SettlementList from '@/components/session/SettlementList';
import NightTitleChips from '@/components/session/NightTitleChips';

/**
 * The moment a night ends.
 *
 * The screen people are looking at together, phones out, right after the chips
 * are counted — so it opens with the result and the payments, and the
 * accounting trivia it used to lead with is gone: session duration (a
 * bankroll-tool metric, D-002) and a "Transactions: 1" tile that counted the
 * rows in the list immediately below it.
 *
 * It shares its headline, board and story with the session page, so a night
 * cannot describe itself two different ways depending on which route you
 * reached it by.
 */
const SettlementView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { canEdit } = useRole();
  const { data: session, isLoading } = useSession(sessionId || '');
  // Use the session's actual groupId instead of context's selectedGroup
  // to avoid mismatch when viewing sessions from different groups
  const { data: summary, isLoading: summaryLoading } = useSessionSummary(
    sessionId || '',
    session?.groupId || ''
  );
  const { data: belt } = useBelt(session?.groupId || '');

  if (isLoading || !session) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading settlement"
        />
      </div>
    );
  }

  const currency = session.group?.currency;
  const settlements: Settlement[] = session.settlements
    ? JSON.parse(session.settlements)
    : [];

  const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;

  // Recorded rebuy rows first, reconstruction second — never buy-in arithmetic.
  const rebuysByPlayer = rebuyCountsByPlayer({
    entries: session.entries || [],
    rebuyEvents: session.rebuyEvents,
    defaultBuyIn: session.group?.defaultBuyIn,
  });

  const results = (session.entries || []).map((entry) => ({
    ...entry,
    profit: entry.cashOut - entry.buyIn,
    rebuys: rebuysByPlayer.get(entry.playerId) ?? 0,
  }));

  // One description of the night, shared by the text and the image so they can
  // never disagree.
  const shareInput = () =>
    buildNightShareInput({
      date: session.date,
      currency: session.group?.currency,
      entries: results.map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.player ? displayName(entry.player) : 'Unknown',
        profit: entry.profit,
      })),
      settlements,
      titles: summary?.titles || [],
      belt,
    });

  // Night titles are a story surface — show nicknames where the group set one.
  const displayNames = new Map(
    (session.entries || []).map((e) => [
      e.playerId,
      e.player ? displayName(e.player) : '',
    ])
  );

  const handleCopyForWhatsApp = async () => {
    const message = formatNightMessage(shareInput());

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied settlement message for WhatsApp');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="space-y-5">
      <NightHeadline
        eyebrow={format(parseLocalDate(session.date), 'EEEE, MMMM d, yyyy')}
        title="Session Complete!"
        meta={[
          session.location && { icon: MapPin, label: session.location },
          { icon: Users, label: `${formatCount(results.length)} players` },
        ]}
        stats={[{ label: 'Pot', value: formatMoney(totalPot, { currency, decimals: 2 }) }]}
        entries={results}
        currency={currency}
      >
        {summary && summary.titles.length > 0 && (
          <NightTitleChips titles={summary.titles} nicknames={displayNames} className="mt-6" />
        )}
      </NightHeadline>

      {/* The reason anyone is on this page: who pays whom. */}
      <Card className="border-primary/40 p-5 shadow-elev-2 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Settle up</h2>
            <p className="text-label text-muted-foreground">
              The fewest payments that square the table
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareCardButton
              size="sm"
              buildScene={() => buildNightCardScene(shareInput())}
              filename={nightCardFilename(session.date)}
            />
            <Button variant="outline" size="sm" onClick={handleCopyForWhatsApp}>
              <Copy className="mr-2 h-4 w-4" />
              Copy for WhatsApp
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <SettlementList
            sessionId={session.id}
            settlements={settlements}
            canEdit={canEdit}
            currency={currency}
          />
        </div>
      </Card>

      {results.length > 0 && (
        <NightResultsBoard rows={results} currency={currency} title="Final results" />
      )}

      <NightStory summary={summary} loading={summaryLoading} currency={currency} />

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/sessions')} className="flex-1">
          View all sessions
        </Button>
        <Button variant="outline" onClick={() => navigate('/data-entry')} className="flex-1">
          Start new session
        </Button>
      </div>
    </div>
  );
};

export default SettlementView;
