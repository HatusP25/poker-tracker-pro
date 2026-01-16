import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Upload, AlertCircle, CheckCircle2, Settings as SettingsIcon, Trash2, Eye, Edit3 } from 'lucide-react';
import { backupApi } from '@/lib/api';
import { toast } from 'sonner';
import { useGroupContext } from '@/context/GroupContext';
import { useRole } from '@/context/RoleContext';
import { useUpdateGroup, useDeleteGroup } from '@/hooks/useGroups';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings = () => {
  const { selectedGroup, setSelectedGroup } = useGroupContext();
  const { role, setRole, canEdit } = useRole();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group settings state
  const [groupName, setGroupName] = useState(selectedGroup?.name || '');
  const [defaultBuyIn, setDefaultBuyIn] = useState(selectedGroup?.defaultBuyIn.toString() || '5');
  const [currency, setCurrency] = useState(selectedGroup?.currency || 'USD');

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    if (groupName.trim().length < 3) {
      toast.error('Group name must be at least 3 characters');
      return;
    }

    const buyInValue = parseFloat(defaultBuyIn);
    if (isNaN(buyInValue) || buyInValue <= 0) {
      toast.error('Default buy-in must be a positive number');
      return;
    }

    updateGroup.mutate({
      id: selectedGroup.id,
      data: {
        name: groupName.trim(),
        defaultBuyIn: buyInValue,
        currency: currency,
      },
    });
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    deleteGroup.mutate(selectedGroup.id, {
      onSuccess: () => {
        setSelectedGroup(null);
      },
    });
  };

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

      {/* User Role Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Role
          </CardTitle>
          <CardDescription>
            Control what you can do in the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userRole">Current Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'VIEWER' | 'EDITOR')}>
              <SelectTrigger id="userRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Viewer</div>
                      <div className="text-xs text-muted-foreground">Read-only access</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="EDITOR">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Editor</div>
                      <div className="text-xs text-muted-foreground">Can create and modify data</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            {role === 'VIEWER' ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <p className="font-medium">Viewer Mode Active</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      You can view all data but cannot create, edit, or delete anything.
                      Perfect for sharing your poker stats without risking accidental changes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <p className="font-medium">Editor Mode Active</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Full access to create sessions, manage players, and modify all data.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group Settings */}
      {selectedGroup ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Group Settings
            </CardTitle>
            <CardDescription>
              Manage settings for {selectedGroup.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            {/* Default Buy-In */}
            <div className="space-y-2">
              <Label htmlFor="defaultBuyIn">Default Buy-In</Label>
              <Input
                id="defaultBuyIn"
                type="number"
                step="0.01"
                min="0"
                value={defaultBuyIn}
                onChange={(e) => setDefaultBuyIn(e.target.value)}
                placeholder="5.00"
              />
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="MXN">MXN ($)</SelectItem>
                  <SelectItem value="ARS">ARS ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Players</span>
                <span className="font-medium">{selectedGroup._count?.players || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sessions</span>
                <span className="font-medium">{selectedGroup._count?.sessions || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={handleUpdateGroup}
                disabled={updateGroup.isPending}
              >
                {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGroupName(selectedGroup.name);
                  setDefaultBuyIn(selectedGroup.defaultBuyIn.toString());
                  setCurrency(selectedGroup.currency);
                }}
              >
                Reset
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="border-t pt-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Irreversible actions that will permanently delete data
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the group
                        <strong> "{selectedGroup.name}"</strong> and all associated data:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>{selectedGroup._count?.players || 0} players</li>
                          <li>{selectedGroup._count?.sessions || 0} sessions</li>
                          <li>All session entries and statistics</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteGroup}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please select a group to manage its settings
            </p>
          </CardContent>
        </Card>
      )}

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
