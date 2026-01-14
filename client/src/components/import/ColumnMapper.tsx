import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnMapping } from '@/lib/import';

interface ColumnMapperProps {
  headers: string[];
  mapping: Partial<ColumnMapping>;
  onChange: (mapping: Partial<ColumnMapping>) => void;
}

const ColumnMapper = ({ headers, mapping, onChange }: ColumnMapperProps) => {
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...mapping };

    if (value === 'none') {
      delete newMapping[field];
    } else {
      newMapping[field] = parseInt(value, 10);
    }

    onChange(newMapping);
  };

  const fields: Array<{ key: keyof ColumnMapping; label: string; required: boolean }> = [
    { key: 'date', label: 'Session Date', required: false },
    { key: 'startTime', label: 'Start Time', required: false },
    { key: 'endTime', label: 'End Time', required: false },
    { key: 'location', label: 'Location', required: false },
    { key: 'playerName', label: 'Player Name', required: true },
    { key: 'buyIn', label: 'Buy-In Amount', required: true },
    { key: 'cashOut', label: 'Cash-Out Amount', required: true },
    { key: 'notes', label: 'Notes', required: false },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Map CSV Columns</h3>
        <p className="text-sm text-muted-foreground">
          Match your CSV columns to the required fields. Fields marked with * are required.
        </p>
      </div>

      <div className="grid gap-4">
        {fields.map((field) => (
          <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
            <Label htmlFor={field.key} className="text-right">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={
                mapping[field.key] !== undefined
                  ? mapping[field.key]!.toString()
                  : 'none'
              }
              onValueChange={(value) => handleMappingChange(field.key, value)}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {field.required ? 'Select column...' : 'None (skip)'}
                </SelectItem>
                {headers.map((header, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="p-4 bg-secondary rounded-lg">
        <h4 className="text-sm font-medium mb-2">Tips:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Player names must match existing players in your group</li>
          <li>• Date format should be YYYY-MM-DD or MM/DD/YYYY</li>
          <li>• Buy-in and cash-out amounts should be numeric values</li>
          <li>
            • Multiple rows with the same date/time/location will be grouped into one
            session
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ColumnMapper;
