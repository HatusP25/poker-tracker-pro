import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { backupApi } from '@/lib/api';
import { toast } from 'sonner';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await backupApi.export();

      // Create blob from response
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Database exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(error.response?.data?.error || 'Failed to export database');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      // Read file
      const fileText = await file.text();
      const backup = JSON.parse(fileText);

      // Validate backup first
      const validation = await backupApi.validate(backup);

      if (!validation.data.valid) {
        toast.error('Invalid backup file', {
          description: validation.data.errors.join(', '),
        });
        setIsImporting(false);
        return;
      }

      if (validation.data.warnings.length > 0) {
        toast.warning('Backup validation warnings', {
          description: validation.data.warnings.join(', '),
        });
      }

      // Import backup
      const result = await backupApi.import(backup, {
        mode: importMode,
        skipDuplicates,
      });

      if (result.data.report.success) {
        toast.success('Import completed successfully', {
          description: `Imported: ${result.data.report.imported.groups} groups, ${result.data.report.imported.players} players, ${result.data.report.imported.sessions} sessions`,
        });

        // Reload page to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Import completed with errors', {
          description: result.data.report.errors.join(', '),
        });
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      toast.error(error.response?.data?.error || 'Failed to import database');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application settings and data
        </p>
      </div>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Export your entire database to JSON format or import a backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Export Database</h3>
              <p className="text-sm text-muted-foreground">
                Download a complete backup of all your data (groups, players, sessions, entries)
              </p>
            </div>
            <Button onClick={handleExport} disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Database'}
            </Button>
          </div>

          <div className="border-t pt-6">
            {/* Import Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Import Database</h3>
                <p className="text-sm text-muted-foreground">
                  Restore data from a backup file
                </p>
              </div>

              {/* Import Options */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Import Mode</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <strong>Merge</strong> - Keep existing data and add new items
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <strong>Replace</strong> - Delete all existing data and import backup
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm font-normal cursor-pointer">
                    Skip duplicate items (recommended)
                  </Label>
                </div>
              </div>

              {/* Warning for Replace Mode */}
              {importMode === 'replace' && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">Warning: Replace Mode</p>
                    <p className="text-muted-foreground">
                      This will permanently delete ALL existing data before importing. Make sure you
                      have a backup first!
                    </p>
                  </div>
                </div>
              )}

              {/* Success Info */}
              <div className="flex gap-2 p-3 bg-primary/10 border border-primary/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Import Process</p>
                  <ul className="text-muted-foreground space-y-1 mt-1 list-disc list-inside">
                    <li>Backup file will be validated before import</li>
                    <li>Import runs in a transaction (all or nothing)</li>
                    <li>Page will reload automatically after successful import</li>
                  </ul>
                </div>
              </div>

              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-file-input"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Select Backup File'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium">Poker Tracker Pro</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
