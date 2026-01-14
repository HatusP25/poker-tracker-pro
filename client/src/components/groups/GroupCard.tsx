import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import type { Group } from '@/types';

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

const GroupCard = ({ group, onClick }: GroupCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{group.name}</CardTitle>
            <CardDescription>
              Default Buy-In: {group.currency} {group.defaultBuyIn.toFixed(2)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Click to select this group
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupCard;
