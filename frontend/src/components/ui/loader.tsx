"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface LoaderProps {
  variant?: "circular" | "pulse-dot" | "dots" | "typing" | "loading-dots";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function PulseDotLoader({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "size-1",
    md: "size-2",
    lg: "size-3",
  };

  return (
    <div className={cn("flex items-center justify-center gap-1", className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            sizeClasses[size],
            "rounded-full bg-foreground/60 animate-pulse"
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function DotsLoader({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <div className={cn("flex items-center gap-1", className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            dotSizes[size],
            "rounded-full bg-muted-foreground animate-bounce"
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function TypingLoader({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dotSizes = {
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
    lg: "h-2 w-2",
  };

  return (
    <div className={cn("flex items-center gap-1", className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            dotSizes[size],
            "rounded-full bg-foreground/50"
          )}
          style={{
            animation: "typing 1s ease-in-out infinite",
            animationDelay: `${i * 200}ms`,
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function TextDotsLoader({
  className,
  text = "Thinking",
  size = "md",
}: {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)} role="status" aria-label="Loading">
      <span className={cn(textSizes[size], "text-muted-foreground")}>{text}</span>
      <span className="flex">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(textSizes[size], "text-muted-foreground animate-pulse")}
            style={{ animationDelay: `${i * 300}ms` }}
          >
            .
          </span>
        ))}
      </span>
    </div>
  );
}

function Loader({ variant = "pulse-dot", size = "md", text, className }: LoaderProps) {
  switch (variant) {
    case "pulse-dot":
      return <PulseDotLoader size={size} className={className} />;
    case "dots":
      return <DotsLoader size={size} className={className} />;
    case "typing":
      return <TypingLoader size={size} className={className} />;
    case "loading-dots":
      return <TextDotsLoader text={text} size={size} className={className} />;
    default:
      return <PulseDotLoader size={size} className={className} />;
  }
}

export { Loader };
