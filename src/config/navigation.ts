import {
  Bookmark,
  Briefcase,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Search,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The 01–05 motif; only the primary workflow destinations carry one. */
  index?: string;
  /** Match nested routes such as /resume/[id]. */
  prefix?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const workspaceNav: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Your career",
    items: [
      { href: "/profile", label: "Profile", icon: FileText, index: "01" },
      {
        href: "/projects",
        label: "Projects",
        icon: FolderOpen,
        prefix: true,
      },
      {
        href: "/resume",
        label: "Resumes",
        icon: Briefcase,
        index: "02",
        prefix: true,
      },
    ],
  },
  {
    label: "Find work",
    items: [
      { href: "/jobs", label: "Jobs", icon: Search, index: "03", prefix: true },
      { href: "/saved", label: "Saved", icon: Bookmark },
      {
        href: "/applications",
        label: "Applications",
        icon: LayoutDashboard,
        index: "05",
        prefix: true,
      },
    ],
  },
];

/** The five destinations that fit a phone's bottom bar. */
export const mobileNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: FileText },
  { href: "/resume", label: "Resumes", icon: Briefcase, prefix: true },
  { href: "/jobs", label: "Jobs", icon: Search, prefix: true },
  {
    href: "/applications",
    label: "Tracker",
    icon: Bookmark,
    prefix: true,
  },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.prefix)
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}
