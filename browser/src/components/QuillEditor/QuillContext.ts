import type { Bounds } from 'quill';
import type Quill from 'quill';
import React from 'react';

interface QuillContextType {
  /** call this function when should open/close context menu */
  onInputAt?: (inputing: boolean, index?: number, bounds?: Bounds) => void;
  /** call this function when quill instance is ready */
  onQuillLoad?: (quill: Quill) => void;
  /** call this function when user delete context */
  onDeleteContext?: (contextValue: string) => void;
}

export const QuillContext = React.createContext<QuillContextType>({});
