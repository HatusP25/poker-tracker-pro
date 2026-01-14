import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const StatCardSkeleton = () => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCardSkeleton;
