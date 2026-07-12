import CardSkeleton from './skeletons/CardSkeleton';

const RouteLoader = () => {
  return (
    <div className="space-y-4 p-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
};

export default RouteLoader;
