export interface IWorkspaceMeta {
  folders: Folder[];
  smartFolders: SmartFolder[];
  quickAccess: QuickAccess[];
  tagsGroups: TagsGroup[];
  modificationTime: number;
  applicationVersion: string;
}

export interface QuickAccess {
  type: 'folder';
  id: string;
}

export interface Rules {
  property: string;
  method: string;
  value: string[];
}

export interface Conditions {
  rules: Rules[];
  match: string;
  boolean: string;
}

export interface SmartFolder {
  id: string;
  name: string;
  description?: string;
  modificationTime: number;
  children: SmartFolder[];
  conditions: Conditions[];
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  children?: Folder[];
  modificationTime: number;
  tags?: any[];
  password?: string;
  passwordTips?: string;
  coverId?: string;
}

export interface TagsGroup {
  id: string;
  name: string;
  tags: string[];
}

export interface IWorkspace {
  readonly rootDir: string;
  meta: IWorkspaceMeta | undefined;

  init: () => Promise<void>;

  destroy: () => Promise<void>;

  absPath: (...p: string[]) => string;

  updateMeta: (params: IWorkspaceMeta) => Promise<void>

  saveMetadata: () => Promise<void>

  readMetaData: () => IWorkspaceMeta | undefined
}
