'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm", "data-[state=open]:animate-in data-[state=open]:fade-in-0", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0", className)} {...props} />;
}
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content data-slot="dialog-content" className={cn("fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2", "w-full max-w-sm rounded-2xl glass-panel-solid p-0 shadow-2xl", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>;
}
function DialogBody({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={cn("p-4", className)} {...props} />;
}
function DialogHeader({
  className,
  children,
  hideCloseButton = false,
  ...props
}: React.ComponentProps<'div'> & {
  hideCloseButton?: boolean;
}) {
  return <div data-slot="dialog-header" className={cn("flex items-center justify-between border-b border-border/50 px-4 py-3", className)} {...props}>
      {children}
      {!hideCloseButton && <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>}
    </div>;
}
function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border/50 px-4 py-3", className)} {...props} />;
}
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-base font-semibold", className)} {...props} />;
}
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

// Extended color palette for drawing tools
const colorPalette = {
  grays: [{
    name: 'Black',
    value: '#000000'
  }, {
    name: 'Dark Gray',
    value: '#374151'
  }, {
    name: 'Gray',
    value: '#6B7280'
  }, {
    name: 'Light Gray',
    value: '#9CA3AF'
  }, {
    name: 'Silver',
    value: '#D1D5DB'
  }, {
    name: 'White',
    value: '#FFFFFF'
  }],
  reds: [{
    name: 'Rose',
    value: '#FEE2E2'
  }, {
    name: 'Light Red',
    value: '#FCA5A5'
  }, {
    name: 'Red',
    value: '#EF4444'
  }, {
    name: 'Dark Red',
    value: '#DC2626'
  }, {
    name: 'Deep Red',
    value: '#B91C1C'
  }, {
    name: 'Maroon',
    value: '#7F1D1D'
  }],
  oranges: [{
    name: 'Peach',
    value: '#FFEDD5'
  }, {
    name: 'Light Orange',
    value: '#FDBA74'
  }, {
    name: 'Orange',
    value: '#F97316'
  }, {
    name: 'Dark Orange',
    value: '#EA580C'
  }, {
    name: 'Burnt Orange',
    value: '#C2410C'
  }, {
    name: 'Brown',
    value: '#7C2D12'
  }],
  yellows: [{
    name: 'Cream',
    value: '#FEF9C3'
  }, {
    name: 'Light Yellow',
    value: '#FDE047'
  }, {
    name: 'Yellow',
    value: '#EAB308'
  }, {
    name: 'Gold',
    value: '#CA8A04'
  }, {
    name: 'Dark Gold',
    value: '#A16207'
  }, {
    name: 'Olive',
    value: '#713F12'
  }],
  greens: [{
    name: 'Mint',
    value: '#DCFCE7'
  }, {
    name: 'Light Green',
    value: '#86EFAC'
  }, {
    name: 'Green',
    value: '#22C55E'
  }, {
    name: 'Dark Green',
    value: '#16A34A'
  }, {
    name: 'Forest',
    value: '#15803D'
  }, {
    name: 'Deep Green',
    value: '#14532D'
  }],
  teals: [{
    name: 'Light Teal',
    value: '#CCFBF1'
  }, {
    name: 'Aqua',
    value: '#5EEAD4'
  }, {
    name: 'Teal',
    value: '#14B8A6'
  }, {
    name: 'Dark Teal',
    value: '#0D9488'
  }, {
    name: 'Deep Teal',
    value: '#0F766E'
  }, {
    name: 'Dark Cyan',
    value: '#134E4A'
  }],
  blues: [{
    name: 'Sky',
    value: '#DBEAFE'
  }, {
    name: 'Light Blue',
    value: '#93C5FD'
  }, {
    name: 'Blue',
    value: '#3B82F6'
  }, {
    name: 'Royal Blue',
    value: '#2563EB'
  }, {
    name: 'Dark Blue',
    value: '#1D4ED8'
  }, {
    name: 'Navy',
    value: '#1E3A8A'
  }],
  purples: [{
    name: 'Lavender',
    value: '#EDE9FE'
  }, {
    name: 'Light Purple',
    value: '#C4B5FD'
  }, {
    name: 'Purple',
    value: '#8B5CF6'
  }, {
    name: 'Violet',
    value: '#7C3AED'
  }, {
    name: 'Dark Purple',
    value: '#6D28D9'
  }, {
    name: 'Deep Purple',
    value: '#4C1D95'
  }],
  pinks: [{
    name: 'Light Pink',
    value: '#FCE7F3'
  }, {
    name: 'Pink',
    value: '#F9A8D4'
  }, {
    name: 'Hot Pink',
    value: '#EC4899'
  }, {
    name: 'Magenta',
    value: '#DB2777'
  }, {
    name: 'Dark Pink',
    value: '#BE185D'
  }, {
    name: 'Deep Pink',
    value: '#831843'
  }]
};
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  trigger: React.ReactNode;
}
function ColorPicker({
  value,
  onChange,
  trigger
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [customColor, setCustomColor] = React.useState(value);
  const handleColorSelect = (color: string) => {
    onChange(color);
    setOpen(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Color</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* Color Grid */}
          <div className="space-y-2">
            {Object.entries(colorPalette).map(([category, colors]) => <div key={category} className="gap-1.5 flex items-center justify-center">
                {colors.map(color => <button key={color.value} onClick={() => handleColorSelect(color.value)} className={cn("w-7 h-7 rounded-lg transition-all hover:scale-110 border border-border/30", value === color.value && "ring-2 ring-foreground ring-offset-2 ring-offset-background")} style={{
              backgroundColor: color.value
            }} title={color.name} />)}
              </div>)}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <label className="text-sm font-medium text-muted-foreground">Custom:</label>
            <div className="flex items-center gap-2 flex-1">
              <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-10 h-8 rounded-lg border border-border cursor-pointer" />
              <input type="text" value={customColor} onChange={e => setCustomColor(e.target.value)} placeholder="#000000" className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-muted/50 border border-border/50 outline-none focus:ring-2 focus:ring-primary/50" />
              <button onClick={() => handleColorSelect(customColor)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Apply
              </button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>;
}
export { Dialog, DialogClose, DialogContent, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, ColorPicker, colorPalette };