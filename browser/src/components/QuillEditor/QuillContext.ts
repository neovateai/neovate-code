import type { Bounds, Delta } from 'quill';
import type Quill from 'quill';
import React from 'react';

interface QuillContextType {
  /** call this function when should open/close context menu */
  onInputAt?: (inputing: boolean, index?: number, bounds?: Bounds) => void;
  /** call this function when quill instance is ready */
  onQuillLoad?: (quill: Quill) => void;
  /** call this function when user delete context */
  onDeleteContexts?: (contextValues: string[]) => void;
  /** call this function when keyboard key down in editor */
  onKeyDown?: (code: number) => void;
  /** call this function when editor value change */
  onChange?: (value: string, delta: Delta) => void;

  readonly?: boolean;
}

export const QuillContext = React.createContext<QuillContextType>({});
