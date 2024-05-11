import { IDrag } from './drag';

export interface IWebsiteImageMeta {
  type: string;
  src?: string;
  title?: string;
  origin?: string
  base64?: string;
}

export interface IWebsiteImage extends IDrag {}
