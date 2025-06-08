
"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import React from "react";

interface DashboardLinkCardProps {
  title: string;
  description: string;
  count?: React.ReactNode; // Can be number, string, or a loading/error component
  icon: LucideIcon;
  href: string;
  linkText: string;
}

export const DashboardLinkCard: React.FC<DashboardLinkCardProps> = React.memo(function DashboardLinkCard({
  title,
  description,
  count,
  icon: Icon,
  href,
  linkText,
}) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <Icon className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow">
            {typeof count === 'number' || typeof count === 'string' ? (
            <div className="text-3xl font-bold">{count}</div>
            ) : (
            count // Render loading/error component directly
            )}
            <p className="text-xs text-muted-foreground mb-4 min-h-[2.5rem] line-clamp-2"> {/* min-h ensure space, h-10 was too much */}
            {description}
            </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full mt-auto">
          <Link href={href}>
            {linkText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
});
DashboardLinkCard.displayName = "DashboardLinkCard";
