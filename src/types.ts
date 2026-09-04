/** Info used when appearing in Google Search results. */
export interface GoogleSearchInfo {
  title: string;
  description: string;
}

/** The card social platforms build when a link to the site is shared. */
export interface OpenGraphInfo {
  /** Headline on the card, which need not match the page's own title. */
  title?: string;
  /** Blurb on the card, which need not match the page's meta description. */
  description?: string;
  /** Served as-is from public/, so the URL stays stable for scraper caches. */
  image: string;
  imageWidth: number;
  imageHeight: number;
}

/** The site's icons, all served as-is from public/. */
export interface SiteIcons {
  /** 32px raster, and the only icon the tab bar needs. */
  png: string;
  /** 180px icon iOS uses when the site is saved to the home screen. */
  appleTouch: string;
}

export interface SiteInfo {
  title: string;
  description: string;
  /** The site owner, as structured data names them. */
  owner: string;
  footer: string;
  /** Production origin, used to make share and canonical URLs absolute. */
  url: string;
  google: GoogleSearchInfo;
  openGraph: OpenGraphInfo;
  icons: SiteIcons;
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

/** A numbered note rendered beneath a section, keyed to a <sup> in its prose. */
export interface CaseStudyFootnote {
  /** The marker shown before the note, matching the <sup> in html_content. */
  id: number;
  html_content: string;
}

export interface CaseStudySection {
  title: string;
  html_content?: string;
  footnotes?: CaseStudyFootnote[];
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
