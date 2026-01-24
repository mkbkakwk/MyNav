export interface LinkItem {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji character
  url: string;
}

export interface SectionData {
  id: string;
  title: string;
  icon: string; // Emoji character
  items: LinkItem[];
}

export interface SidebarItem {
  id: string;
  title: string;
  icon: string; // Emoji character
  href: string;
}

export interface SearchEngine {
  name: string;
  color: string;
  url: string;
  suggestionSource: 'baidu' | 'google' | 'bing' | '360' | 'none';
}

export interface Category {
  id: string;
  name: string;
  engines: SearchEngine[];
}
