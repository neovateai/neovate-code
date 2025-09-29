import { VerticalLeftOutlined } from '@ant-design/icons';
import { Tabs, type TabsProps } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/codeViewer';
import type {
  CodeDiffViewerTabItem,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import DevFileIcon from '../DevFileIcon';
import CodeDiffView from './CodeDiffView';
import CodeNormalView from './CodeNormalView';

const useStyle = createStyles(({ css, token }) => {
  return {
    layout: css`
      width: 100%;
      height: 100%;
      display: flex;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      box-shadow: -2px 0 8px -2px rgba(0, 0, 0, 0.16);
      background: #fff;
      transition:
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
      will-change: opacity, box-shadow, border-color;
      overflow: hidden;
      &:hover {
        box-shadow: -2px 0 12px -2px rgba(0, 0, 0, 0.22);
        border-color: ${token.colorPrimaryActive};
      }
    `,
    tabs: css`
      flex: 1;
      padding: 8px;
      height: 100%;
      width: 100%;
      overflow: hidden;
      /* 让 CodeViewer 的 Tabs 内容区和 tabpane 100% 高 */
      .ant-tabs-content,
      .ant-tabs-content-holder,
      .ant-tabs-tabpane {
        height: 100%;
      }
    `,
    extra: css`
      margin: 0 12px;
      cursor: pointer;
    `,
  };
});

function renderIcon(path?: string) {
  const suffix = path?.split('.').pop()?.toLocaleLowerCase();
  if (suffix) {
    return <DevFileIcon fileExt={suffix} />;
  } else {
    return null;
  }
}

const CodeViewer = () => {
  const { codeViewerTabItems, activeId } = useSnapshot(state);
  const { styles } = useStyle();

  const items = useMemo<TabsProps['items']>(() => {
    return codeViewerTabItems.map((item) => ({
      key: item.id,
      label: item.title,
      closeable: true,
      icon: renderIcon(item.path),
      children:
        item.viewType === 'normal' ? (
          <CodeNormalView
            item={item as CodeNormalViewerTabItem}
            ref={(ref) => {
              if (ref && 'jumpToLine' in ref) {
                actions.registerJumpFunction(item.id, (lineCount) =>
                  ref.jumpToLine(lineCount),
                );
              }
            }}
          />
        ) : (
          <CodeDiffView
            item={item as CodeDiffViewerTabItem}
            ref={(ref) => {
              if (ref && 'jumpToLine' in ref) {
                actions.registerJumpFunction(item.id, (lineCount) =>
                  ref.jumpToLine(lineCount),
                );
              }
            }}
          />
        ),
    }));
  }, [codeViewerTabItems]);

  const handleEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove') {
      actions.removeItem(targetKey as string);
    }
  };

  return (
    <div className={styles.layout}>
      <Tabs
        hideAdd
        tabPosition="top"
        activeKey={activeId}
        className={styles.tabs}
        items={items}
        type="editable-card"
        onChange={(activeKey) => actions.setActiveId(activeKey)}
        onEdit={handleEdit}
        tabBarExtraContent={{
          left: (
            <div
              className={styles.extra}
              onClick={() => actions.setVisible(false)}
            >
              <VerticalLeftOutlined />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default CodeViewer;
