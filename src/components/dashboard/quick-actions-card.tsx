
"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, type ButtonProps } from "@/components/ui/button"; // Ensure ButtonProps is exported from button.tsx

export interface QuickActionItem {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
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
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant || "default"}
            size={action.size || "lg"}
            className={action.className || "w-full"}
          >
            <Link href={action.href}>
              <action.icon className="mr-2 h-5 w-5" /> {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
});
QuickActionsCard.displayName = "QuickActionsCard";
