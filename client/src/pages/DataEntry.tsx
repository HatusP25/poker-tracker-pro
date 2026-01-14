import { useNavigate } from 'react-router-dom';
import { useGroupContext } from '@/context/GroupContext';
import SessionForm from '@/components/sessions/SessionForm';

const DataEntry = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Show success message or navigate to sessions page
    navigate('/sessions');
  };

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Session</h1>
        <p className="text-muted-foreground">Record a new poker session for {selectedGroup.name}</p>
      </div>

      <SessionForm
        groupId={selectedGroup.id}
        defaultBuyIn={selectedGroup.defaultBuyIn}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default DataEntry;
