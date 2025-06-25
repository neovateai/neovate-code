import { VerticalLeftOutlined } from '@ant-design/icons';
import { Tabs, type TabsProps } from 'antd';
import { createStyles } from 'antd-style';
import React, { useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/codeViewer';
import type {
  CodeDiffViewerTabItem,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import DevFileIcon from '../DevFileIcon';
import CodeDiffView, { type CodeDiffViewRef } from './CodeDiffView';
import CodeNormalView, { type CodeNormalViewRef } from './CodeNormalView';

const useStyle = createStyles(({ css }) => {
  return {
    layout: css`
      width: 40vw;
      display: flex;
      height: 100%;
    `,
    tabs: css`
      flex: 1;
      padding: 8px;
      height: 100%;
      width: 40vw;

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
  const codeViewRefs = useRef<{
    [key: string]: CodeNormalViewRef | CodeDiffViewRef | null;
  }>({});

  const items = useMemo<TabsProps['items']>(() => {
    const comp = codeViewerTabItems.map((item) => ({
      key: item.id,
      label: item.title,
      closeable: true,
      icon: renderIcon(item.path),
      children:
        item.viewType === 'normal' ? (
          <CodeNormalView
            item={item as CodeNormalViewerTabItem}
            ref={(r) => {
              codeViewRefs.current[item.id] = r;
            }}
          />
        ) : (
          <CodeDiffView
            item={item as CodeDiffViewerTabItem}
            ref={(r) => {
              codeViewRefs.current[item.id] = r;
            }}
          />
        ),
    }));

    for (const path in codeViewRefs.current) {
      const ref = codeViewRefs.current[path];
      if (ref && 'jumpToLine' in ref) {
        actions.registerJumpFunction(path, (lineCount) =>
          ref.jumpToLine(lineCount),
        );
      }
    }

    return comp;
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
