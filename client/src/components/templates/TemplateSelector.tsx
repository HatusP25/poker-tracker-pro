import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Save, Trash2 } from 'lucide-react';
import { useTemplates, useDeleteTemplate } from '@/hooks/useTemplates';
import type { SessionTemplate } from '@/types';

interface TemplateSelectorProps {
  groupId: string;
  onLoadTemplate: (template: SessionTemplate) => void;
  onSaveTemplate: () => void;
  currentFormData: {
    location?: string;
    startTime?: string;
    playerIds: string[];
  };
}

const TemplateSelector = ({
  groupId,
  onLoadTemplate,
  onSaveTemplate,
  currentFormData
}: TemplateSelectorProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const { data: templates = [], isLoading } = useTemplates(groupId);
  const deleteTemplate = useDeleteTemplate();

  const handleLoadTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      onLoadTemplate(template);
    }
  };

  const handleDeleteTemplate = () => {
    if (selectedTemplateId && confirm('Are you sure you want to delete this template?')) {
      deleteTemplate.mutate(selectedTemplateId);
      setSelectedTemplateId('');
    }
  };

  const canSaveTemplate = currentFormData.playerIds.length >= 2;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Templates</CardTitle>
          <CardDescription>Loading templates...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Session Templates
        </CardTitle>
        <CardDescription>
          Load a saved template or save the current setup for quick entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length > 0 ? (
          <div className="flex gap-2">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => {
                  const playerIds = JSON.parse(template.playerIds) as string[];
                  return (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({playerIds.length} players)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadTemplate}
              disabled={!selectedTemplateId}
            >
              Load
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDeleteTemplate}
              disabled={!selectedTemplateId}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No templates yet. Add players and click "Save as Template" to create one.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onSaveTemplate}
          disabled={!canSaveTemplate}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Current Setup as Template
        </Button>
        {!canSaveTemplate && (
          <p className="text-xs text-muted-foreground text-center">
            Add at least 2 players to save a template
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateSelector;
