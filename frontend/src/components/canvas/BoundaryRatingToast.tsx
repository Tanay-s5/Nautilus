import { useState } from "react";
import { X, Star } from "lucide-react";
import type { LinkRecord, RatingResponse } from "@/lib/api";

interface BoundaryRatingToastProps {
  links: LinkRecord[];
  onRate: (lid: string, rating: number) => Promise<RatingResponse | null>;
  onDismiss: () => void;
}

/** Quick-rate popup for the handful of links from a just-created card that
 * the default weights were least confident about (LinkRecord.is_boundary).
 * These are the most informative links to get a human rating on, so we ask
 * right away instead of waiting for someone to find the dedicated review
 * panel. Cycles through one link at a time; skipping or rating advances. */
export function BoundaryRatingToast({ links, onRate, onDismiss }: BoundaryRatingToastProps) {
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const current = links[index];
  if (!current) return null;

  const advance = () => {
    if (index + 1 >= links.length) {
      onDismiss();
    } else {
      setIndex(index + 1);
      setRating(50);
    }
  };

  const handleRate = async () => {
    setSubmitting(true);
    await onRate(current.lid, rating);
    setSubmitting(false);
    advance();
  };

  return (
    <div className="w-80 p-3 rounded-lg shadow-lg bg-card border border-border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Star className="w-3.5 h-3.5" />
          How related is this?
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{current.short_label}</p>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground w-8">Not</span>
        <input
          type="range"
          min={0}
          max={100}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-10 text-right">Very</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {links.length > 1 ? `${index + 1} of ${links.length}` : rating}
        </span>
        <div className="flex gap-2">
          <button
            onClick={advance}
            className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleRate}
            disabled={submitting}
            className="px-3 py-1 text-xs bg-accent text-accent-foreground rounded disabled:opacity-50"
          >
            Rate
          </button>
        </div>
      </div>
    </div>
  );
}
