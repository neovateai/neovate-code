export interface Theme {
  bashBorder: string;
  claude: string;
  permission: string;
  secondaryBorder: string;
  text: string;
  secondaryText: string;
  suggestion: string;
  // Semantic colors
  success: string;
  error: string;
  warning: string;
  diff: {
    added: string;
    removed: string;
    addedDimmed: string;
    removedDimmed: string;
  };
}

export const darkTheme: Theme = {
  bashBorder: '#fd5db1',
  claude: '#D97757',
  permission: '#b1b9f9',
  secondaryBorder: '#888',
  text: '#fff',
  secondaryText: '#999',
  suggestion: '#b1b9f9',
  success: '#4eba65',
  error: '#ff6b80',
  warning: '#ffc107',
  diff: {
    added: '#225c2b',
    removed: '#7a2936',
    addedDimmed: '#47584a',
    removedDimmed: '#69484d',
  },
};
