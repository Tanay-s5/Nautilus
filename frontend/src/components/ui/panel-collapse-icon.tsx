import { cn } from "@/lib/utils";

interface PanelCollapseIconProps {
  collapsed: boolean;
  className?: string;
}

/**
 * Custom collapse/expand icon matching the reference design.
 * Shows a panel with chevron indicator.
 */
export function PanelCollapseIcon({ collapsed, className }: PanelCollapseIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      {/* Outer rounded rectangle */}
      <rect x="3" y="3" width="18" height="18" rx="3" />
      
      {/* Vertical divider line */}
      <line x1="9" y1="3" x2="9" y2="21" />
      
      {/* Chevron indicator */}
      {collapsed ? (
        // Chevron pointing right (expand)
        <polyline points="13 9 16 12 13 15" />
      ) : (
        // Chevron pointing left (collapse)
        <polyline points="15 9 12 12 15 15" />
      )}
    </svg>
  );
}
