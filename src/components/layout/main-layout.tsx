'use client';

import { Navbar } from './navbar';
import { SidebarNav } from './sidebar-nav';

import type { ReactNode } from 'react';

import LanguageSwitcher from '@/components/common/LanguageSwitcher'; // Import LanguageSwitcher
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar'; // Import Sidebar components

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className='flex h-screen flex-col'>
        <Navbar />
        <div className='flex flex-1 overflow-hidden'>
          <Sidebar collapsible='icon' side='left' variant='sidebar'>
            <SidebarHeader className='p-4 justify-start items-center hidden group-data-[collapsible=icon]:hidden group-data-[state=expanded]:flex'>
              {/* Optional: You can place a logo or title here if needed when expanded */}
              {/* <CodeXml className="h-6 w-6 mr-2 text-primary" /> */}
              {/* <span className="font-semibold text-lg">CodeMap</span> */}
            </SidebarHeader>
            <SidebarContent>
              <ScrollArea className='h-full'>
                <SidebarNav />
              </ScrollArea>
            </SidebarContent>
            {/* <SidebarFooter> */}
            {/* Footer content if any */}
            {/* </SidebarFooter> */}
          </Sidebar>

          <SidebarInset>
            {' '}
            {/* Main content area that will adjust based on sidebar state */}
            <main className='flex-1 overflow-y-auto bg-muted/30'>
              <div className='container mx-auto p-4 sm:p-6 lg:p-8'>
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
        <LanguageSwitcher /> {/* Added LanguageSwitcher here */}
      </div>
    </SidebarProvider>
  );
}
