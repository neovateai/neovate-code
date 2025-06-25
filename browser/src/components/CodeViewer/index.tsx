import { Tabs, type TabsProps } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/codeViewer';
import CodeDiffView from './CodeDiffView';
import CodeNormalView from './CodeNormalView';

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

      /* 让 CodeViewer 的 Tabs 内容区和 tabpane 100% 高 */
      .ant-tabs-content,
      .ant-tabs-content-holder,
      .ant-tabs-tabpane {
        height: 100%;
      }
    `,
  };
});

const CodeViewer = () => {
  const { codeViewerTabItems, activeId } = useSnapshot(state);
  const { styles } = useStyle();

  const items = useMemo<TabsProps['items']>(() => {
    return codeViewerTabItems.map((item) => ({
      key: item.id.toString(),
      label: item.title,
      closeable: true,

      children:
        item.viewType === 'normal' ? (
          <CodeNormalView item={item} />
        ) : (
          <CodeDiffView item={item} />
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
        activeKey={activeId}
        className={styles.tabs}
        items={items}
        type="editable-card"
        onChange={(activeKey) => actions.setActiveId(activeKey)}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default CodeViewer;
