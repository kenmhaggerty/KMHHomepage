/** The site's icons, all served as-is from public/. */
export interface SiteIcons {
  /** Scalable icon, preferred by browsers that support it. */
  svg: string;
  /** 32px raster, for browsers that do not take an SVG icon. */
  png: string;
  /** 180px icon iOS uses when the site is saved to the home screen. */
  appleTouch: string;
}

export interface SiteInfo {
  title: string;
  icons: SiteIcons;
  footer: string;
  version: string;
}

export interface CaseStudyFilterFlags {
  zero_to_one: boolean;
  consumer: boolean;
  gov_dod: boolean;
  mobile: boolean;
}

export type FilterKey = keyof CaseStudyFilterFlags;

export interface CaseStudyHero {
  desktop: string;
  mobile: string;
  alt_text: string;
}

export interface GalleryItem {
  preview: string;
  full_res: string;
  alt_text: string;
}

export interface CaseStudyLink {
  title: string;
  url: string;
}

export interface CaseStudySection {
  title: string;
  html_content?: string;
  links?: CaseStudyLink[];
}

export interface CaseStudy {
  key: string;
  index: number;
  title: string;
  company: string;
  year: string;
  filters: CaseStudyFilterFlags;
  hero: CaseStudyHero;
  gallery: GalleryItem[];
  sections: CaseStudySection[];
}

export interface AboutInfo {
  title: string;
  avatar: string;
  avatar_alt: string;
  paragraphs: string[];
}
