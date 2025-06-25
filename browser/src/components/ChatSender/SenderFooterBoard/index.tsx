import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import { Flex } from 'antd';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import { modes } from '@/constants/chat';
import { state } from '@/state/sender';

const customAgent = {
  icon: <PlusOutlined />,
  key: 'custom',
  label: '自定义智能体',
  description: '自定义专属的 CodeAgent、灵活定义工具和任务逻辑',
};

const useStyle = createStyles(({ token, css, cx }) => {
  const card = css`
    position: relative;
    width: calc(33.33% - 8px);
    margin: 4px;
    padding: 12px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `;

  const active = css`
    border-color: ${token.colorPrimary};
    background-color: ${token.colorPrimaryBg};
  `;

  return {
    senderFooterBoard: css`
      border-radius: 12px 12px 0 0;
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
      border-radius: 0 0 12px 12px;
      border-color: #d9d9d9;
      border-top: 0 !important;
      border-style: solid;
      padding: 12px;
      overflow: hidden;
      max-height: 500px;
      border-width: 1px;
    `,
    hidden: css`
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
      border-width: 0;
      opacity: 0;
    `,
    card,
    active,
    customCard: cx(
      card,
      css`
        border-style: dashed;
      `,
    ),
    title: css`
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    `,
    desc: css`
      font-size: 12px;
      color: ${token.colorTextSecondary};
    `,
    icon: css`
      font-size: 18px;
      margin-right: 8px;
    `,
    check: css`
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 18px;
      color: ${token.colorPrimary};
    `,
  };
});

export default function SenderFooterBoard() {
  const { styles, cx } = useStyle();
  const { openFooter, mode } = useSnapshot(state);

  const handleModeClick = (key: any) => {
    state.mode = key;
    state.openFooter = false;
  };

  return (
    <div className={cx(styles.senderFooterBoard, !openFooter && styles.hidden)}>
      <Flex wrap="wrap" justify="flex-start">
        {modes.map((item) => (
          <div
            key={item.key}
            className={cx(styles.card, mode === item.key && styles.active)}
            onClick={() => handleModeClick(item.key)}
          >
            {mode === item.key && (
              <CheckCircleFilled className={styles.check} />
            )}
            <Flex align="center" className={styles.title}>
              <div className={styles.icon}>{item.icon}</div>
              <div>{item.label}</div>
            </Flex>
            <div className={styles.desc}>{item.description}</div>
          </div>
        ))}
        <div className={styles.customCard}>
          <Flex align="center" className={styles.title}>
            <div className={styles.icon}>{customAgent.icon}</div>
            <div>{customAgent.label}</div>
          </Flex>
          <div className={styles.desc}>{customAgent.description}</div>
        </div>
      </Flex>
    </div>
  );
}
