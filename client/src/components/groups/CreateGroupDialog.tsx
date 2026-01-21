import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateGroup } from '@/hooks/useGroups';

const createGroupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be less than 50 characters'),
  defaultBuyIn: z.number().min(0, 'Buy-in must be positive').optional(),
  currency: z.string().min(1, 'Currency is required').max(3, 'Currency must be 3 characters or less').default('USD'),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupDialog = ({ open, onOpenChange }: CreateGroupDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      defaultBuyIn: 5,
      currency: 'USD',
    },
  });

  const onSubmit = async (data: CreateGroupForm) => {
    setError(null);
    try {
      await createGroup.mutateAsync(data as any);
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        setError(response?.data?.error || 'Failed to create group');
      } else {
        setError('Failed to create group');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>Create a new poker group to start tracking your sessions.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input id="name" placeholder="Friday Night Poker" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultBuyIn">Default Buy-In</Label>
              <Input
                id="defaultBuyIn"
                type="number"
                step="0.01"
                placeholder="5.00"
                {...register('defaultBuyIn', { valueAsNumber: true })}
              />
              {errors.defaultBuyIn && <p className="text-sm text-destructive">{errors.defaultBuyIn.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" placeholder="USD" maxLength={3} {...register('currency')} />
              {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
