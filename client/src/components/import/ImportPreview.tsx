import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SessionImportData } from '@/lib/import';

interface ImportPreviewProps {
  data: SessionImportData[];
}

const ImportPreview = ({ data }: ImportPreviewProps) => {
  // Group by session for display
  const sessionGroups = new Map<string, SessionImportData[]>();

  data.forEach(entry => {
    const key = `${entry.date}|${entry.startTime || ''}|${entry.endTime || ''}|${entry.location || ''}`;
    if (!sessionGroups.has(key)) {
      sessionGroups.set(key, []);
    }
    sessionGroups.get(key)!.push(entry);
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Import Preview</h3>
        <p className="text-sm text-muted-foreground">
          Review the data before importing. {sessionGroups.size} session(s) will be created with{' '}
          {data.length} player entries.
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        {Array.from(sessionGroups.entries()).map(([key, entries], sessionIndex) => {
          const firstEntry = entries[0];
          return (
            <div key={key} className="border-b last:border-b-0">
              <div className="bg-secondary p-3">
                <h4 className="font-medium text-sm">
                  Session {sessionIndex + 1}: {formatDate(firstEntry.date)}
                  {firstEntry.location && ` • ${firstEntry.location}`}
                  {firstEntry.startTime && ` • ${firstEntry.startTime}`}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {entries.length} player(s)
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Buy-In</TableHead>
                    <TableHead className="text-right">Cash-Out</TableHead>
                    <TableHead className="text-right">Profit/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, entryIndex) => {
                    const profit = entry.cashOut - entry.buyIn;
                    return (
                      <TableRow key={entryIndex}>
                        <TableCell className="font-medium">{entry.playerName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.buyIn)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.cashOut)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              profit >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}
                            {formatCurrency(profit)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-secondary rounded-lg">
        <h4 className="text-sm font-medium mb-2">Summary:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Sessions to create</p>
            <p className="font-medium">{sessionGroups.size}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total entries</p>
            <p className="font-medium">{data.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total buy-ins</p>
            <p className="font-medium">
              {formatCurrency(data.reduce((sum, entry) => sum + entry.buyIn, 0))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total cash-outs</p>
            <p className="font-medium">
              {formatCurrency(data.reduce((sum, entry) => sum + entry.cashOut, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPreview;
