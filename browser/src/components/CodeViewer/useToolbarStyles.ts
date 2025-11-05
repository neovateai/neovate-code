import { createStyles } from 'antd-style';

export const useToolbarStyles = createStyles(({ css }) => {
  return {
    toolbar: css`
      position: relative;
      width: 100%;
      height: 34px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      background-color: #F6F8FB;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
    `,
    metaInfo: css`
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #666F8D;
      font-family: "PingFang SC";
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      line-height: 20px /* 166.667% */;
    `,
  };
});
