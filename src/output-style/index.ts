import { type Context } from '../context';
import { getBuiltinOutputStyles } from './builtin';
import {
  loadGlobalOutputStyles,
  loadProjectOutputStyles,
} from './filesystem-loader';
import { type OutputStyle } from './types';

export * from './types';
export * from './filesystem-loader';
export * from './builtin';

export class OutputStyleManager {
  private context: Context;
  private outputStyles: Map<string, OutputStyle> = new Map();

  constructor(context: Context) {
    this.context = context;
    this.loadOutputStyles();
  }

  private loadOutputStyles() {
    const allOutputStyles: OutputStyle[] = [
      ...getBuiltinOutputStyles(),
      ...loadGlobalOutputStyles(this.context.paths.globalConfigDir),
      ...loadProjectOutputStyles(this.context.paths.projectConfigDir),
    ];

    this.outputStyles.clear();
    for (const style of allOutputStyles) {
      this.outputStyles.set(style.name, style);
    }
  }

  getOutputStyle(name: string): OutputStyle {
    return this.outputStyles.get(name) || this.getOutputStyle('Default');
  }

  getAllOutputStyles(): OutputStyle[] {
    return Array.from(this.outputStyles.values());
  }

  getBuiltinOutputStyles(): OutputStyle[] {
    return getBuiltinOutputStyles();
  }

  getCurrentOutputStyle(): OutputStyle {
    const outputStyleName = this.context.config.outputStyle || 'Default';
    const outputStyle = this.getOutputStyle(outputStyleName);
    if (!outputStyle) {
      console.warn(`Output style '${outputStyleName}' not found`);
      return this.getOutputStyle('Default');
    }
    return outputStyle;
  }
}
