import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, X, Check, StickyNote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  usePlayerNotes,
  useCreatePlayerNote,
  useUpdatePlayerNote,
  useDeletePlayerNote,
} from '@/hooks/usePlayerNotes';
import type { PlayerNote } from '@/types';

const parseTags = (tags: string | null): string[] => {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseTagInput = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

interface PlayerNotesProps {
  playerId: string;
  canEdit: boolean;
}

const PlayerNotes = ({ playerId, canEdit }: PlayerNotesProps) => {
  const { data: notes, isLoading } = usePlayerNotes(playerId);
  const createNote = useCreatePlayerNote(playerId);
  const updateNote = useUpdatePlayerNote(playerId);
  const deleteNote = useDeletePlayerNote(playerId);

  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    await createNote.mutateAsync({
      note: newNote.trim(),
      tags: parseTagInput(newTags),
    });
    setNewNote('');
    setNewTags('');
  };

  const startEdit = (note: PlayerNote) => {
    setEditingId(note.id);
    setEditNote(note.note);
    setEditTags(parseTags(note.tags).join(', '));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
    setEditTags('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editNote.trim()) return;

    await updateNote.mutateAsync({
      noteId,
      data: { note: editNote.trim(), tags: parseTagInput(editTags) },
    });
    cancelEdit();
  };

  const handleDelete = async (noteId: string) => {
    await deleteNote.mutateAsync(noteId);
    if (editingId === noteId) cancelEdit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Notes
        </CardTitle>
        <CardDescription>
          Reads, tells, and banter-worthy tendencies — not bookkeeping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <div className="space-y-2 pb-4 border-b">
            <Textarea
              placeholder="e.g. Always bluffs the river on a paired board..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              data-testid="new-note-input"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Tags (comma separated, e.g. bluffer, calling-station)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                data-testid="new-note-tags-input"
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || createNote.isPending}
                data-testid="add-note-button"
              >
                Add Note
              </Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading notes...</p>}

        {!isLoading && notes && notes.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No notes yet. {canEdit ? 'Drop a read above.' : 'Nothing on file for this player.'}
          </p>
        )}

        {!isLoading && notes && notes.length > 0 && (
          <ul className="space-y-3">
            {notes.map((note) => {
              const tags = parseTags(note.tags);
              const isEditing = editingId === note.id;

              return (
                <li key={note.id} className="rounded-lg bg-muted p-3" data-testid="player-note">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        data-testid="edit-note-input"
                      />
                      <Input
                        placeholder="Tags (comma separated)"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        data-testid="edit-note-tags-input"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editNote.trim() || updateNote.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <p className="text-sm whitespace-pre-wrap break-words">{note.note}</p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(note)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(note.id)}
                            disabled={deleteNote.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerNotes;
