import { IDrag } from '@beaver/types';

export interface IWebsiteLink extends IDrag {
  hasBgImage: (element: HTMLElement) => void;
}