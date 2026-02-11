import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Music, Tags, Settings, Search, FileText, Database, ShieldCheck, UserCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "SyncVisor", url: createPageUrl("Search"), icon: Search },
  { title: "SyncPulse", url: createPageUrl("SyncPulse"), icon: Music },
  { title: "SyncRadar", url: createPageUrl("SyncRadar"), icon: Tags },
  { title: "SyncDex", url: createPageUrl("TagBank"), icon: Database },
  { title: "SyncClause", url: createPageUrl("DealBuilder"), icon: FileText },
  { title: "SyncChain", url: createPageUrl("SyncChain"), icon: ShieldCheck },
  { title: "SyncContact", url: createPageUrl("SyncContact"), icon: UserCircle },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --syncit-bg: #E3DDDB;
          --syncit-orange: #F96F51;
          --syncit-orange-light: #FF8B6B;
          --syncit-orange-dark: #E45A42;
        }
      `}</style>
      
      <div className="min-h-screen flex w-full" style={{ backgroundColor: '#E3DDDB' }}>
        <Sidebar className="border-r border-gray-300 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-gray-300 p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">SyncCore by SyncIt</h2>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`transition-all duration-200 rounded-xl mb-2 text-gray-700 hover:text-white ${
                          location.pathname === item.url 
                            ? 'text-white shadow-lg' 
                            : 'hover:shadow-md'
                        }`}
                        style={{
                          backgroundColor: location.pathname === item.url 
                            ? '#F96F51' 
                            : 'transparent',
                          // This ':hover' pseudo-class style is not directly supported by React's style prop for dynamic hover effects.
                          // It typically requires CSS modules, styled-components, or Tailwind's hover variants for dynamic hover styles.
                          // Keeping it as is for now, but noting it might not produce the intended dynamic hover background directly from the style prop.
                          ':hover': { 
                            backgroundColor: location.pathname === item.url 
                              ? '#E45A42' 
                              : 'rgba(249, 111, 81, 0.1)'
                          }
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen">
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-300 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger 
                className="p-2 rounded-lg transition-colors duration-200"
                style={{ 
                  backgroundColor: 'rgba(249, 111, 81, 0.1)',
                  color: '#F96F51'
                }}
              />
               <h2 className="text-md font-bold text-gray-800 tracking-tight">SyncCore by SyncIt</h2>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}