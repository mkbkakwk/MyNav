export interface LinkItem {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji character
  url: string;
  pinned?: boolean;     // 置顶/收藏:显示在"常用站点"视图中
  pinnedIndex?: number; // 置顶卡在"常用站点"视图末尾的排序序号
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

export interface SyncSettings {
  token: string;
  owner: string;
  repo: string;
  enabled: boolean;
}
