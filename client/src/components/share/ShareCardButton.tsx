import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImageDown, Loader2 } from 'lucide-react';
import { shareScene } from '@/lib/renderShareCard';
import type { Scene } from '@/lib/shareCard';

interface ShareCardButtonProps {
  /** Built lazily so a scene is only laid out when someone actually shares. */
  buildScene: () => Scene;
  filename: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

/**
 * Renders the given scene to a PNG and opens the OS share sheet, falling back to
 * a download. Text gets skimmed in a group chat; images get forwarded.
 */
const ShareCardButton = ({
  buildScene,
  filename,
  label = 'Share image',
  variant = 'outline',
  size = 'default',
  className,
}: ShareCardButtonProps) => {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const outcome = await shareScene(buildScene(), filename);
      if (outcome === 'downloaded') toast.success('Image saved');
      else if (outcome === 'shared') toast.success('Image shared');
      // A cancelled share sheet needs no toast — the user knows what they did.
    } catch (error) {
      console.error('Share card failed:', error);
      toast.error('Could not create the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={busy}
      className={className}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ImageDown className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
};

export default ShareCardButton;
