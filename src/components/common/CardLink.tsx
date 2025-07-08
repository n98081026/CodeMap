'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CardLinkProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const CardLink: React.FC<CardLinkProps> = ({
  href,
  title,
  description,
  icon,
}) => (
  <Link href={href} passHref>
    <Card className='h-full transform cursor-pointer overflow-hidden rounded-xl bg-card text-card-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-primary/20'>
      <CardHeader className='items-center text-center'>
        {icon}
        <CardTitle className='text-xl font-semibold'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='text-center text-sm text-muted-foreground'>
        <p>{description}</p>
      </CardContent>
    </Card>
  </Link>
);
