import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface RippleEffect {
  x: number;
  y: number;
  id: number;
}

interface Position {
  x: number;
  y: number;
}

interface FloatingChatInputProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const SendButton = memo(({ isDisabled, isLoading }: { isDisabled: boolean; isLoading?: boolean }) => {
  return (
    <button
      type="submit"
      aria-label="Send message"
      disabled={isDisabled || isLoading}
      className={cn(
        "self-end mb-2 mr-2 h-8 w-8 flex items-center justify-center rounded-full border-0 p-0 transition-all z-20 shrink-0",
        isDisabled || isLoading
          ? "opacity-40 cursor-not-allowed bg-muted-foreground/30 text-muted-foreground"
          : "opacity-90 bg-foreground text-background hover:opacity-100 cursor-pointer hover:shadow-lg"
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ArrowUp className="w-4 h-4" strokeWidth={2} />
      )}
    </button>
  );
});

SendButton.displayName = "SendButton";

const GlowEffects = memo(({ mousePosition }: { mousePosition: Position }) => {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 backdrop-blur-2xl rounded-2xl pointer-events-none" />
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `0 0 0 1px rgba(147, 51, 234, 0.08), 0 0 8px rgba(147, 51, 234, 0.12), 0 0 16px rgba(236, 72, 153, 0.08), 0 0 24px rgba(59, 130, 246, 0.06)`,
          filter: "blur(0.5px)",
        }}
      />
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle 120px at ${mousePosition.x}% ${mousePosition.y}%, rgba(147,51,234,0.06) 0%, rgba(236,72,153,0.04) 30%, rgba(59,130,246,0.03) 60%, transparent 100%)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </>
  );
});

GlowEffects.displayName = "GlowEffects";

const RippleEffects = memo(({ ripples }: { ripples: RippleEffect[] }) => {
  if (ripples.length === 0) return null;
  return (
    <>
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{ left: ripple.x - 25, top: ripple.y - 25, width: 50, height: 50 }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-400/10 via-pink-400/8 to-blue-400/10 animate-ping" />
        </div>
      ))}
    </>
  );
});

RippleEffects.displayName = "RippleEffects";

export function FloatingChatInput({
  placeholder = "Ask anything...",
  onSubmit,
  disabled = false,
  isLoading = false,
}: FloatingChatInputProps) {
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 50, y: 50 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const throttleRef = useRef<number | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24;
      const minHeight = lineHeight * 1;
      const maxHeight = lineHeight * (isMobile ? 4 : 6);
      textareaRef.current.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + "px";
    }
  }, [value, isMobile]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim() && onSubmit && !disabled && !isLoading) {
        onSubmit(value.trim());
        setValue("");
      }
    },
    [value, onSubmit, disabled, isLoading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (containerRef.current && !throttleRef.current) {
      throttleRef.current = window.setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setMousePosition({ x, y });
        }
        throttleRef.current = null;
      }, 50);
    }
  }, []);

  const addRipple = useCallback((x: number, y: number) => {
    if (ripples.length < 5) {
      const newRipple: RippleEffect = { x, y, id: Date.now() };
      setRipples((prev) => [...prev, newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
      }, 600);
    }
  }, [ripples.length]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        addRipple(e.clientX - rect.left, e.clientY - rect.top);
      }
    },
    [addRipple]
  );

  const isSubmitDisabled = disabled || !value.trim() || isLoading;

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3 w-full">
      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          isMobile ? "w-full" : "w-[480px] max-w-[calc(100vw-2rem)]"
        )}
      >
        <div
          ref={containerRef}
          onMouseMove={!isMobile ? handleMouseMove : undefined}
          onClick={!isMobile ? handleClick : undefined}
          className={cn(
            "relative flex w-full",
            "bg-card/80 backdrop-blur-xl shadow-lg rounded-2xl",
            "border border-border/50",
            "overflow-visible group transition-all duration-300",
            "hover:bg-card/90 hover:border-border/70 hover:shadow-xl"
          )}
          style={{
            boxShadow: "0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.08)",
          }}
        >
          {!isMobile && <GlowEffects mousePosition={mousePosition} />}
          {!isMobile && <RippleEffects ripples={ripples} />}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Message Input"
            rows={1}
            className={cn(
              "flex-1 bg-transparent text-sm font-normal text-left",
              "text-foreground placeholder-muted-foreground/60",
              "border-0 outline-none ring-0 focus:outline-none focus:ring-0",
              "px-4 py-3 z-20 relative resize-none overflow-y-auto"
            )}
            style={{
              fontFamily: '"Inter", sans-serif',
              lineHeight: "24px",
              minHeight: "24px",
              maxHeight: isMobile ? "96px" : "144px",
            }}
            disabled={disabled || isLoading}
          />
          
          <SendButton isDisabled={isSubmitDisabled} isLoading={isLoading} />
        </div>
      </form>
    </div>
  );
}
