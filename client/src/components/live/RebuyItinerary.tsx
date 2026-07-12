import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Pencil, Trash2, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { validateRebuy } from '@/lib/moneyValidation';
import type { RebuyEvent } from '@/types';

interface RebuyItineraryProps {
  rebuyEvents: RebuyEvent[];
  /** Show edit/delete controls. Only meaningful for an in-progress session an EDITOR is viewing. */
  editable?: boolean;
  onEdit?: (rebuyId: string, amount: number) => void;
  onDelete?: (rebuyId: string) => void;
}

const RebuyItinerary = ({ rebuyEvents, editable = false, onEdit, onDelete }: RebuyItineraryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (event: RebuyEvent) => {
    setEditingId(event.id);
    setEditValue(event.amount.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const editAmountValidity = validateRebuy(parseFloat(editValue));

  const confirmEdit = (rebuyId: string) => {
    if (!editAmountValidity.valid) return;
    onEdit?.(rebuyId, parseFloat(editValue));
    setEditingId(null);
    setEditValue('');
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDelete?.(deletingId);
      setDeletingId(null);
    }
  };

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
            {rebuyEvents.map((event) => {
              const isEditing = editingId === event.id;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-2 border-b last:border-0 gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{event.player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(event.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="h-8 w-24 text-right font-mono"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        disabled={!editAmountValidity.valid}
                        onClick={() => confirmEdit(event.id)}
                        aria-label="Save rebuy amount"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEdit}
                        aria-label="Cancel editing rebuy"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-lg text-amber-600">
                        +${event.amount.toFixed(2)}
                      </span>
                      {editable && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(event)}
                            aria-label="Edit rebuy"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(event.id)}
                            aria-label="Delete rebuy"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rebuy?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the rebuy and subtracts it from the player's total buy-in. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default RebuyItinerary;
