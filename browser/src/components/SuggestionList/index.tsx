import { LeftOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, type InputRef, List } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AutoTooltip from './AutoTooltip';

export type SuggestionItem = {
  label: React.ReactNode;
  value: string;

  icon?: React.ReactNode;

  children?: SuggestionItem[];

  extra?: React.ReactNode;
};

interface Props {
  children?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items: SuggestionItem[];
  virtual?: boolean;
  onSelect?: (firstKey: string, itemValue: string) => void;
  /** 返回值会覆盖默认的二级列表 */
  onSearch?: (firstKey: string, text: string) => SuggestionItem[] | undefined;
}

const useStyles = createStyles(({ css, token }) => {
  return {
    listItem: css`
      min-width: 200px;
      height: 40px;
      user-select: none;
      cursor: pointer;

      &:hover {
        background-color: ${token.controlItemBgHover};
      }
    `,
    listItemLabel: css`
      font-weight: 600;
    `,
    listItemContent: css`
      padding: 0 ${token.paddingSM}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    `,
    listItemContentMain: css`
      display: flex;
      align-items: center;
      column-gap: 12px;
    `,
    listHeader: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    listInput: css`
      margin: 0 4px;
    `,
    list: css`
      max-height: 500px;
      overflow-y: auto;
    `,
    popup: css`
      background-color: ${token.colorBgElevated};
      border-radius: ${token.borderRadius}px;
      border: 1px solid ${token.colorBorder};
      box-shadow: ${token.boxShadowSecondary};
      padding: 4px;
      width: fit-content;
    `,
  };
});

const SuggesionList = (props: Props) => {
  const { children, onSearch, onOpenChange, onSelect, open, items } = props;

  const { t } = useTranslation();
  const { styles } = useStyles();

  const [selectedFirstKey, setSelectedFirstKey] = useState<string>();
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>();
  const inputRef = useRef<InputRef>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const firstLevelList = useMemo(() => items, [items]);
  const secondLevelList = useMemo(() => {
    if (searchResults) {
      return searchResults;
    } else {
      return (
        items.find((item) => item.value === selectedFirstKey)?.children || []
      );
    }
  }, [items, searchResults, selectedFirstKey]);

  const clearSearch = () => {
    if (inputRef.current?.input) {
      inputRef.current.input.value = '';
    }
    setSearchResults(undefined);
  };

  const renderItem = (item: SuggestionItem) => {
    return (
      <List.Item
        className={styles.listItem}
        key={item.value}
        onClick={() => {
          if (selectedFirstKey) {
            onSelect?.(selectedFirstKey, item.value);
            setSelectedFirstKey(undefined);
          } else {
            clearSearch();
            setSelectedFirstKey(item.value);
          }
        }}
      >
        <div className={styles.listItemContent}>
          <div className={styles.listItemContentMain}>
            <div>{item.icon}</div>
            <AutoTooltip maxWidth={300} className={styles.listItemLabel}>
              {item.label}
            </AutoTooltip>
          </div>
          <AutoTooltip maxWidth={300}>{item.extra}</AutoTooltip>
        </div>
      </List.Item>
    );
  };

  const ListHeader = useMemo(() => {
    if (selectedFirstKey) {
      return (
        <div className={styles.listHeader}>
          <Button
            icon={<LeftOutlined />}
            onClick={() => {
              setSelectedFirstKey(undefined);
            }}
            type="text"
          />
          <Input
            ref={inputRef}
            className={styles.listInput}
            size="small"
            variant="underlined"
            autoFocus
            onChange={(e) => {
              const searchResults = onSearch?.(
                selectedFirstKey,
                e.target.value,
              );
              setSearchResults(searchResults);
            }}
            placeholder={t('common.placeholder')}
          />
        </div>
      );
    } else {
      return null;
    }
  }, [onSearch, selectedFirstKey]);

  // TODO 最大宽度xx，超出时xxx

  // auto close popup when lost focus
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onOpenChange?.(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <Dropdown
      open={open}
      onOpenChange={onOpenChange}
      placement="top"
      popupRender={() => (
        <div className={styles.popup} ref={popupRef}>
          {ListHeader}
          <List
            className={styles.list}
            locale={{
              emptyText: t('common.empty'),
            }}
            split={false}
            dataSource={selectedFirstKey ? secondLevelList : firstLevelList}
            renderItem={renderItem}
          />
        </div>
      )}
      trigger={[]}
      autoFocus
    >
      {children}
    </Dropdown>
  );
};

export default SuggesionList;
