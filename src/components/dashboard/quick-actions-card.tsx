"use client";

import React, { useCallback } from "react"; // Added useCallback
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { HelpCircle } from "lucide-react"; // Added HelpCircle
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip components
import useTutorialStore from "@/stores/tutorial-store"; // Added tutorial store import
import { cn } from "@/lib/utils"; // Added cn

export interface QuickActionItem {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  id?: string;
  tutorialKey?: string; // New: Key for the tutorial flow to trigger
  tutorialButtonTooltip?: string; // New: Tooltip for the tutorial button
}

interface QuickActionsCardProps {
  title?: string;
  description?: string;
  actions: QuickActionItem[];
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = React.memo(function QuickActionsCard({
  title = "Quick Actions",
  description = "Get started with common tasks quickly.",
  actions,
}) {
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback(s => ({ startOrResumeTutorial: s.startOrResumeTutorial }), [])
  );

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-1 md:grid-cols-2"> {/* Adjusted grid for potentially wider items */}
        {actions.map((action) => (
          <div key={action.href} className="flex items-center space-x-2">
            <Button
              asChild
              variant={action.variant || "default"}
              size={action.size || "lg"}
              className={cn("flex-grow", action.className)} // Use flex-grow for main button
              id={action.id}
            >
              <Link href={action.href}>
                <action.icon className="mr-2 h-5 w-5" /> {action.label}
              </Link>
            </Button>
            {action.tutorialKey && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startOrResumeTutorial(action.tutorialKey!, 0, true)}
                      aria-label={action.tutorialButtonTooltip || `Show ${action.label} tutorial`}
                      className="flex-shrink-0" // Prevent tutorial button from shrinking
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.tutorialButtonTooltip || `Show tutorial for "${action.label}"`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
});
QuickActionsCard.displayName = "QuickActionsCard";
