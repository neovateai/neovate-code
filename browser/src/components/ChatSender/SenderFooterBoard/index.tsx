import { CheckCircleOutlined } from '@ant-design/icons';
import { Flex } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { getModes } from '@/constants/chat';
import { actions, state } from '@/state/sender';

const useStyle = createStyles(({ token, css }) => {
  const card = css`
    position: relative;
    width: calc(25% - 8px);
    margin: 4px;
    padding: 16px;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusLG}px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    border: 1px solid ${token.colorBorderSecondary};

    &:hover {
      background: ${token.colorFillSecondary};
    }
  `;

  return {
    senderFooterBoard: css`
      border-radius: 12px;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      box-shadow:
        0 1px 2px 0 rgba(0, 0, 0, 0.03),
        0 1px 6px -1px rgba(0, 0, 0, 0.02),
        0 2px 4px 0 rgba(0, 0, 0, 0.02);
      transition:
        max-height 0.3s ease-in-out,
        opacity 0.3s ease-in-out,
        padding 0.3s ease-in-out,
        border-width 0.3s ease-in-out;
      border-color: #d9d9d9;
      border-style: solid;
      padding: 12px;
      overflow: hidden;
      max-height: 500px;
      border-width: 1px;
      margin-top: 12px;
    `,
    hidden: css`
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
      border-width: 0;
      opacity: 0;
    `,
    card,
    title: css`
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    `,
    desc: css`
      font-size: 12px;
      color: ${token.colorTextSecondary};
      line-height: 1.5;
    `,
    icon: css`
      font-size: 16px;
      margin-right: 8px;
    `,
    check: css`
      font-size: 14px;
      color: ${token.colorTextSecondary};
      margin-right: 8px;
      position: relative;
      top: 4px;
    `,
  };
});

export default function SenderFooterBoard() {
  const { styles, cx } = useStyle();
  const { openFooter, mode } = useSnapshot(state);
  const { t } = useTranslation();
  const MODES = getModes(t);

  const onModeClick = (key: string) => {
    actions.updateModeAndFooterVisible(key, false);
  };

  return (
    <div className={cx(styles.senderFooterBoard, !openFooter && styles.hidden)}>
      <Flex wrap="wrap" justify="start">
        {MODES.map((item) => (
          <div
            key={item.key}
            className={cx(styles.card)}
            onClick={() => onModeClick(item.key)}
          >
            <div className="flex items-start justify-between w-full">
              <Flex align="center" className={styles.title}>
                <div className={styles.icon}>{item.icon}</div>
                <div>{item.label}</div>
              </Flex>
              {mode === item.key && (
                <CheckCircleOutlined className={styles.check} />
              )}
            </div>
            <div className={styles.desc}>{item.description}</div>
          </div>
        ))}
      </Flex>
    </div>
  );
}
