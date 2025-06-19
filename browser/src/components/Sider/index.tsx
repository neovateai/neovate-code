import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import { Avatar, Button } from 'antd';
import { createStyles } from 'antd-style';
import logoPng from './imgs/kmi-ai.png';

const useStyle = createStyles(({ token, css }) => {
  return {
    sider: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      box-sizing: border-box;
    `,
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      height: 40px;
    `,
    conversations: css`
      flex: 1;
      overflow-y: auto;
      margin-top: 12px;
      padding: 0;

      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    siderFooter: css`
      border-top: 1px solid ${token.colorBorderSecondary};
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
  };
});

const Sider = () => {
  const { styles } = useStyle();

  return (
    <div className={styles.sider}>
      {/* 🌟 Logo */}
      <div className={styles.logo}>
        <img
          src={logoPng}
          draggable={false}
          alt="logo"
          width={24}
          height={24}
        />
        <span>Takumi</span>
      </div>

      {/* 🌟 添加会话 */}
      <Button
        onClick={() => {
          console.log('add conversation');
        }}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
      >
        New Conversation
      </Button>

      {/* 🌟 会话管理 */}
      <Conversations
        items={[]}
        className={styles.conversations}
        activeKey={''}
        onActiveChange={async (val) => {
          console.log('onActiveChange', val);
        }}
        groupable
        styles={{ item: { padding: '0 8px' } }}
        menu={(conversation) => ({
          items: [
            {
              label: 'Rename',
              key: 'rename',
              icon: <EditOutlined />,
            },
            {
              label: 'Delete',
              key: 'delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                console.log('delete conversation', conversation);
              },
            },
          ],
        })}
      />

      <div className={styles.siderFooter}>
        <Avatar size={24} />
        <Button type="text" icon={<QuestionCircleOutlined />} />
      </div>
    </div>
  );
};

export default Sider;
