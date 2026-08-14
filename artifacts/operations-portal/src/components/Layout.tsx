import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Store,
  Package,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Droplet,
  Route as RouteIcon,
  History,
  Users,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'WhatsApp Pickups', path: '/pickups', icon: MessageCircle },
    { name: 'Shops', path: '/shops', icon: Store },

    { name: 'Collections', path: '/collections', icon: Package },
    { name: 'Route Planner', path: '/routes', icon: RouteIcon },
    { name: 'Route History', path: '/routes/history', icon: History },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border py-4">
            <div className="flex items-center gap-3 px-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Droplet className="h-5 w-5" />
              </div>
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-sidebar-foreground">BotalSePaisa</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Operations Portal</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="py-4">
            <SidebarMenu>
              {navItems.map((item) => (
                item.subItems ? (
                  <Collapsible key={item.name} asChild>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.name}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.path}>
                              <SidebarMenuSubButton asChild isActive={location === subItem.path}>
                                <Link href={subItem.path}>
                                  <span>{subItem.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.path ? (location === item.path || location.startsWith(item.path + '/')) : false}
                      tooltip={item.name}
                    >
                      <Link href={item.path || '#'}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium text-sidebar-foreground">{username}</span>
                <span className="text-xs text-sidebar-foreground/70">Admin</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout} 
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
            <SidebarTrigger />
            <div className="font-semibold text-foreground flex items-center gap-2">
              <Droplet className="h-5 w-5 text-primary" />
              BotalSePaisa
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
