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
  offset?: { left: number; top: number };
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
    listItemSelected: css`
      background-color: ${token.controlItemBgActive} !important;
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
      outline: none;
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
    offset,
  } = props;

  const { t } = useTranslation();
  const { styles } = useStyles();

  const [selectedFirstKey, setSelectedFirstKey] = useState<string>();
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<InputRef>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    setSelectedIndex(-1);
    onSearch?.(targetFirstKey, '');
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentList = selectedFirstKey ? secondLevelList : firstLevelList;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < currentList.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : currentList.length - 1,
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < currentList.length) {
          const selectedItem = currentList[selectedIndex];
          if (selectedFirstKey) {
            onSelect?.(
              selectedFirstKey,
              selectedItem.value,
              selectedItem.contextItem,
            );
            setSelectedFirstKey(undefined);
            setSelectedIndex(-1);
          } else {
            clearSearch(selectedItem.value);
            setSelectedFirstKey(selectedItem.value);
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (selectedFirstKey) {
          setSelectedFirstKey(undefined);
          setSelectedIndex(-1);
        } else {
          onOpenChange?.(false);
        }
        break;
    }
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

  const renderItem = (item: SuggestionItem, index: number) => {
    const isSelected = selectedIndex === index;
    return (
      <List.Item
        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
        key={item.value}
        data-index={index}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={() => {
          if (selectedFirstKey) {
            onSelect?.(selectedFirstKey, item.value, item.contextItem);
            setSelectedFirstKey(undefined);
            setSelectedIndex(-1);
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

  // auto focus when popup opens and reset selected index when switching levels
  useEffect(() => {
    if (open && popupRef.current) {
      // Focus the popup container to enable keyboard navigation
      popupRef.current.focus();
      setSelectedIndex(-1);
    }
  }, [open]);

  // Reset selected index when switching between first and second level
  useEffect(() => {
    setSelectedIndex(-1);
  }, [selectedFirstKey]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      // Use a more reliable method to find the selected item
      const selectedItem = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement;
      if (selectedItem) {
        // Get the list container for proper scrolling
        const listContainer =
          listRef.current.querySelector('.ant-list') || listRef.current;

        // Calculate if item is visible
        const containerRect = listContainer.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();

        // Check if item is outside the visible area
        const isAbove = itemRect.top < containerRect.top;
        const isBelow = itemRect.bottom > containerRect.bottom;

        if (isAbove || isBelow) {
          selectedItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }
    }
  }, [selectedIndex]);

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
        setSelectedIndex(-1);
        onOpenChange?.(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange, selectedFirstKey]);

  const offsetStyles = useMemo(() => {
    if (offset) {
      return {
        ...offset,
        position: 'relative',
      };
    } else {
      return {};
    }
  }, [offset]);

  return (
    <Popover
      className={className}
      open={open}
      onOpenChange={onOpenChange}
      placement="topLeft"
      content={() => (
        <div
          className={styles.popup}
          ref={popupRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {ListHeader}
          <List
            ref={listRef}
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
          ...offsetStyles,
        },
      }}
    >
      {children}
    </Popover>
  );
};

export default SuggestionList;
