/**
 * Style constants to avoid magic numbers throughout the codebase
 */
export const STYLE_CONSTANTS = {
  /**
   * Default heights for various components
   */
  HEIGHTS: {
    CODE_VIEWER_MAX_HEIGHT: 400,
    CODE_DIFF_OUTLINE_MAX_HEIGHT: 300,
    PREVIEW_IMAGE_MAX_HEIGHT: 480, // 120 * 4 (120 is 30rem)
  },

  /**
   * Image dimensions
   */
  IMAGES: {
    CONTEXT_TAG_ICON: {
      WIDTH: 30,
      HEIGHT: 20,
    },
    CONTEXT_TAG_PREVIEW: {
      MAX_WIDTH: 384, // max-w-xl
      MAX_HEIGHT: 480, // max-h-120
    },
  },

  /**
   * Timing constants for animations and delays
   */
  TIMING: {
    COPY_SUCCESS_DURATION: 2000,
    ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300,
  },

  /**
   * Z-index values for layering
   */
  Z_INDEX: {
    CLOSE_BUTTON: 10,
    DROPDOWN: 1000,
    MODAL: 1050,
    TOOLTIP: 1070,
  },
} as const;

/**
 * Generate inline style objects for common patterns
 */
export const createHeightStyle = (maxHeight?: number) =>
  maxHeight ? { maxHeight: `${maxHeight}px` } : {};

/**
 * CSS custom properties for theming
 */
export const CSS_VARIABLES = {
  // Color tokens (should ideally come from design system)
  COLORS: {
    PRIMARY: 'var(--ant-color-primary, #1890ff)',
    SUCCESS: 'var(--ant-color-success, #52c41a)',
    ERROR: 'var(--ant-color-error, #ff4d4f)',
    WARNING: 'var(--ant-color-warning, #faad14)',
    INFO: 'var(--ant-color-info, #1890ff)',
  },

  // Spacing (following a consistent scale)
  SPACING: {
    XS: '4px',
    SM: '8px',
    MD: '16px',
    LG: '24px',
    XL: '32px',
  },

  // Border radius
  BORDER_RADIUS: {
    SM: '4px',
    MD: '8px',
    LG: '16px',
    ROUND: '50%',
  },
} as const;

/**
 * Type exports for TypeScript intellisense
 */
export type HeightConstant = keyof typeof STYLE_CONSTANTS.HEIGHTS;
export type ColorConstant = keyof typeof CSS_VARIABLES.COLORS;
export type SpacingConstant = keyof typeof CSS_VARIABLES.SPACING;
