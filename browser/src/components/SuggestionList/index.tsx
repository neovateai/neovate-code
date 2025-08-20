import { LeftOutlined } from '@ant-design/icons';
import { Button, Input, type InputRef, List, Popover } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContextItem } from '@/types/context';
import AutoTooltip from './AutoTooltip';

export type SuggestionItem = {
  label: React.ReactNode;
  value: string;
  icon?: React.ReactNode;
  children?: SuggestionItem[];
  extra?: React.ReactNode;
  contextItem?: ContextItem;
};

interface Props {
  className?: string;
  children?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items: SuggestionItem[];
  virtual?: boolean;
  onSelect?: (
    firstKey: string,
    itemValue: string,
    contextItem?: ContextItem,
  ) => void;
  /** Return value will override the default second-level list */
  onSearch?: (firstKey: string, text: string) => SuggestionItem[] | void;
  loading?: boolean;
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
    listItemLabelSearch: css`
      color: #ff0000;
    `,
    listItemContent: css`
      padding: 0 ${token.paddingSM}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      column-gap: 12px;
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
      padding: 4px 0;
    `,
    listInput: css`
      margin: 0 4px;
    `,
    list: css`
      max-height: 500px;
      overflow-y: auto;
      width: 400px;
    `,
    popup: css`
      background-color: ${token.colorBgElevated};
      border-radius: ${token.borderRadius}px;
      border: 1px solid ${token.colorBorder};
      padding: 4px;
      width: fit-content;
    `,
  };
});

const SuggestionList = (props: Props) => {
  const {
    children,
    onSearch,
    onOpenChange,
    onSelect,
    open,
    items,
    className,
    loading,
  } = props;

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

  const clearSearch = (targetFirstKey: string) => {
    if (inputRef.current?.input) {
      inputRef.current.input.value = '';
    }
    setSearchResults(undefined);
    onSearch?.(targetFirstKey, '');
  };

  const renderItemText = (
    text: React.ReactNode,
    searchText?: string | null,
  ) => {
    if (!searchText || typeof text !== 'string') {
      return text;
    } else {
      const normalTexts = text.split(searchText);
      const renderedTexts = [
        normalTexts[0],
        ...normalTexts.slice(1).map((text, index) => (
          <React.Fragment key={index}>
            <span className={styles.listItemLabelSearch}>{searchText}</span>
            {text}
          </React.Fragment>
        )),
      ];
      return renderedTexts;
    }
  };

  const renderItem = (item: SuggestionItem) => {
    return (
      <List.Item
        className={styles.listItem}
        key={item.value}
        onClick={() => {
          if (selectedFirstKey) {
            onSelect?.(selectedFirstKey, item.value, item.contextItem);
            setSelectedFirstKey(undefined);
          } else {
            clearSearch(item.value);
            setSelectedFirstKey(item.value);
          }
        }}
      >
        <div className={styles.listItemContent}>
          <div className={styles.listItemContentMain}>
            <div>{item.icon}</div>
            <AutoTooltip maxWidth={300} className={styles.listItemLabel}>
              {renderItemText(item.label, inputRef.current?.input?.value)}
            </AutoTooltip>
          </div>
          <AutoTooltip maxWidth={300}>
            {renderItemText(item.extra, inputRef.current?.input?.value)}
          </AutoTooltip>
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
            variant="underlined"
            autoFocus
            onChange={(e) => {
              const searchResults = onSearch?.(
                selectedFirstKey,
                e.target.value,
              );
              if (searchResults) {
                setSearchResults(searchResults);
              } else {
                setSearchResults(undefined);
              }
            }}
            placeholder={t('common.placeholder')}
          />
        </div>
      );
    } else {
      return null;
    }
  }, [onSearch, selectedFirstKey]);

  // auto close popup when lost focus
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        if (selectedFirstKey) {
          clearSearch(selectedFirstKey);
        }

        setSelectedFirstKey(undefined);
        onOpenChange?.(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <Popover
      className={className}
      open={open}
      onOpenChange={onOpenChange}
      placement="topLeft"
      content={() => (
        <div className={styles.popup} ref={popupRef}>
          {ListHeader}
          <List
            className={styles.list}
            locale={{
              emptyText: t('common.empty'),
            }}
            split={false}
            loading={loading}
            dataSource={selectedFirstKey ? secondLevelList : firstLevelList}
            renderItem={renderItem}
          />
        </div>
      )}
      trigger={[]}
      arrow={false}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {children}
    </Popover>
  );
};

export default SuggestionList;
