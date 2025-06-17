import type {
  FullToken,
  GenerateStyle,
  GetDefaultToken,
} from '@ant-design/x/es/theme/cssinjs-utils';
import { genStyleHooks } from '@ant-design/x/es/theme/genStyleUtils';
import { mergeToken } from 'antd/es/theme/internal';

// biome-ignore lint/suspicious/noEmptyInterface: ComponentToken need to be empty by default
export interface ComponentToken {}

interface SuggestionToken extends FullToken<'Suggestion'> {}

const genSuggestionStyle: GenerateStyle<SuggestionToken> = (token) => {
  const { componentCls, antCls } = token;

  return {
    [componentCls]: {
      [`${antCls}-cascader-menus ${antCls}-cascader-menu`]: {
        height: 'auto',
        maxHeight: 500,
        overflowY: 'auto',
      },

      [`${componentCls}-item`]: {
        '&-icon': {
          marginInlineEnd: token.paddingXXS,
        },

        '&-extra': {
          marginInlineStart: token.padding,
        },
      },

      [`&${componentCls}-block`]: {
        [`${componentCls}-item-extra`]: {
          marginInlineStart: 'auto',
        },
      },
    },
  };
};

export const prepareComponentToken: GetDefaultToken<'Suggestion'> = () => ({});

export default genStyleHooks<'Suggestion'>(
  'Suggestion',
  (token) => {
    const SuggestionToken = mergeToken<SuggestionToken>(token, {});
    return genSuggestionStyle(SuggestionToken);
  },
  prepareComponentToken,
);
