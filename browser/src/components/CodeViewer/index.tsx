import { VerticalLeftOutlined } from '@ant-design/icons';
import { Tabs, type TabsProps } from 'antd';
import { createStyles } from 'antd-style';
import React, { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/codeViewer';
import type {
  CodeDiffViewerTabItem,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import DevFileIcon from '../DevFileIcon';
import CodeDiffView from './CodeDiffView';
import CodeNormalView from './CodeNormalView';

const useStyle = createStyles(({ css }) => {
  return {
    layout: css`
      width: 100%;
      display: flex;
      height: 100%;
    `,
    tabs: css`
      flex: 1;
      padding: 8px;
      height: 100%;
      width: 100%;

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
