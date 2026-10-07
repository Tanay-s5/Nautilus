import { useCallback, useEffect, useState } from "react";
import { Star, X, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/hooks/useCanvasStore";
import { getRatingCandidates, getUserWeights, getCachedWeights, type LinkRecord } from "@/lib/api";

const CANDIDATE_LIMIT = 8;

/** Always-available panel for rating links, independent of whatever's on
 * screen right now - complements the quick-rate popup that follows card
 * creation. Pulls from GET /links/candidates, which is already sorted by
 * proximity to the link threshold, so the links shown here are the ones
 * most worth a human opinion. */
export function RatingPanel() {
  const { rateLink } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [candidates, setCandidates] = useState<LinkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, number>>({});
  // Seed from the cached weights.json so there's something to show
  // instantly instead of a blank state while the network call is in flight.
  const [progress, setProgress] = useState<{ untilNext: number; batchSize: number } | null>(() => {
    const cached = getCachedWeights();
    return cached ? { untilNext: cached.ratings_until_next_refit, batchSize: cached.batch_size } : null;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [links, weights] = await Promise.all([
        getRatingCandidates(CANDIDATE_LIMIT),
        getUserWeights(),
      ]);
      setCandidates(links);
      setProgress({ untilNext: weights.ratings_until_next_refit, batchSize: weights.batch_size });
    } catch (err) {
      console.error("Failed to load rating candidates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Quiet badge-count fetch so the trigger button can hint there's
  // something to rate even before the panel is opened.
  useEffect(() => {
    getRatingCandidates(CANDIDATE_LIMIT).then(setCandidates).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const handleRate = async (lid: string) => {
    const rating = ratingDrafts[lid] ?? 50;
    await rateLink(lid, rating);
    setCandidates((prev) => prev.filter((l) => l.lid !== lid));
    setProgress((prev) => (prev ? { ...prev, untilNext: Math.max(0, prev.untilNext - 1) } : prev));
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 h-9 rounded-lg transition-all",
          "bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
          "hover:bg-muted/60 text-foreground text-xs font-medium"
        )}
        title="Rate connections to personalize your graph"
      >
        <Star className="w-4 h-4" strokeWidth={1.75} />
        Rate links
        {candidates.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] leading-none">
            {candidates.length}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="w-[420px] max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col pointer-events-auto rounded-lg bg-background border border-border shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Rate connections</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {progress && progress.untilNext > 0 &&
                        `${progress.untilNext} more rating${progress.untilNext === 1 ? "" : "s"} until your weights update`}
                      {progress && progress.untilNext === 0 && "Next rating triggers a recalibration"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={refresh} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Refresh">
                      <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                  {candidates.length === 0 && !loading && (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      Nothing left to rate right now - create more cards or check back later.
                    </p>
                  )}

                  {candidates.map((link) => {
                    const value = ratingDrafts[link.lid] ?? 50;
                    return (
                      <div key={link.lid} className="p-3 rounded-md border border-border bg-muted/20">
                        <p className="text-xs text-foreground/90 mb-2">{link.short_label}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-muted-foreground w-8">Not</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={value}
                            onChange={(e) =>
                              setRatingDrafts((prev) => ({ ...prev, [link.lid]: Number(e.target.value) }))
                            }
                            className="flex-1 slider-orange"
                          />
                          <span className="text-[10px] text-muted-foreground w-10 text-right">Very</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{value}</span>
                          <button
                            onClick={() => handleRate(link.lid)}
                            className="px-3 py-1 text-xs bg-accent text-accent-foreground rounded"
                          >
                            Rate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
