import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import {
  parseCSV,
  autoDetectColumns,
  validateColumnMapping,
  parseImportData,
  groupBySession,
  readFileAsText,
  type ColumnMapping,
  type SessionImportData,
} from '@/lib/import';
import ColumnMapper from './ColumnMapper';
import ImportPreview from './ImportPreview';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sessions: SessionImportData[][]) => Promise<void>;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const ImportDialog = ({ open, onOpenChange, onImport }: ImportDialogProps) => {
  const { selectedGroup } = useGroupContext();
  const { data: players } = usePlayersByGroup(selectedGroup?.id || '');

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [importData, setImportData] = useState<SessionImportData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      setErrors([]);

      // Read and parse CSV
      const content = await readFileAsText(selectedFile);
      const result = parseCSV(content);

      if (result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }

      setHeaders(result.headers);
      setRows(result.rows);

      // Auto-detect column mappings
      const autoMapping = autoDetectColumns(result.headers);
      setMapping(autoMapping);

      // Validate mapping
      const validation = validateColumnMapping(autoMapping);
      setWarnings(validation.warnings);

      if (validation.isValid) {
        setStep('mapping');
      } else {
        setErrors(validation.errors);
      }
    } catch (error) {
      setErrors([`Failed to process file: ${error}`]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        handleFileSelect(droppedFile);
      } else {
        setErrors(['Please upload a CSV file']);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleMappingComplete = () => {
    if (!players) {
      setErrors(['No players found in group']);
      return;
    }

    // Validate mapping
    const validation = validateColumnMapping(mapping);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Parse import data
    const { data, errors: parseErrors } = parseImportData(
      rows,
      mapping as ColumnMapping,
      players
    );

    if (parseErrors.length > 0) {
      setErrors(parseErrors);
      return;
    }

    setImportData(data);
    setErrors([]);
    setStep('preview');
  };

  const handleImport = async () => {
    try {
      setStep('importing');

      // Group data by session
      const sessionGroups = groupBySession(importData);

      // Call import function
      await onImport(sessionGroups);

      setStep('complete');

      // Reset after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setErrors([`Import failed: ${error}`]);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportData([]);
    setErrors([]);
    setWarnings([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Sessions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import poker sessions and player entries
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop CSV file here</p>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
              </Button>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-secondary rounded">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-500/10 rounded">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <ColumnMapper
              headers={headers}
              mapping={mapping}
              onChange={setMapping}
            />

            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p className="text-sm text-yellow-500">{warning}</p>
                  </div>
                ))}
              </div>
            )}

            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-500/10 rounded">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleMappingComplete}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="space-y-4">
            <ImportPreview data={importData} />

            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-500/10 rounded">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {importData.length} Entries
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Importing sessions...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">
              Successfully imported {importData.length} entries
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
