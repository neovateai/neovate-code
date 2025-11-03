import { createStyles } from 'antd-style';

export const useToolbarStyles = createStyles(({ css }) => {
  return {
    toolbar: css`
      height: 48px;
      padding: 8px 16px;
      margin: -8px 0 6px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      background-color: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
    `,
    metaInfo: css`
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      margin: 0;
    `,
  };
});
