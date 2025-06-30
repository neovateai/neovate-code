import { createStyles } from 'antd-style';

export const useToolbarStyles = createStyles(({ css }) => {
  return {
    toolbar: css`
      height: 48px;
      padding: 4px 12px;
      margin: -8px 0 6px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      column-gap: 12px;

      background-color: #f2f2f2;
      border-radius: 8px;
    `,
    metaInfo: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
      font-size: 12px;
      margin: 0 6px;
    `,
  };
});
