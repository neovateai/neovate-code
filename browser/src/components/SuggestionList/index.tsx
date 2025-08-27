import Icon, {
  ArrowRightOutlined,
  CheckOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { Input, type InputRef, List, Popover } from 'antd';
import { cx } from 'antd-style';
import { groupBy } from 'lodash-es';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import * as context from '@/state/context';
import type { ContextItem } from '@/types/context';
import SmartText from './SmartText';

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
  onSelect?: (
    firstKey: string,
    itemValue: string,
    contextItem?: ContextItem,
  ) => void;
  /** Return value will override the default second-level list */
  onSearch?: (firstKey: string, text: string) => SuggestionItem[] | void;
  onLostFocus?: () => void;
  loading?: boolean;
  offset?: { left: number; top: number };
}

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
    onLostFocus,
  } = props;

  const { t } = useTranslation();

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

  const { attachedContexts } = useSnapshot(context.state);

  const selectedContextMap = useMemo(
    () => groupBy(attachedContexts, 'type'),
    [attachedContexts],
  );

  const isSecondItemSelected = (val: string) => {
    return (
      selectedFirstKey &&
      selectedContextMap?.[selectedFirstKey]?.some(
        (secondItem) => secondItem.value === val,
      )
    );
  };

  const clearSearch = useCallback(
    (targetFirstKey: string) => {
      if (inputRef.current?.input) {
        inputRef.current.input.value = '';
      }
      setSearchResults(undefined);
      onSearch?.(targetFirstKey, '');
    },
    [onSearch],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
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
              if (!isSecondItemSelected(selectedItem.value)) {
                onSelect?.(
                  selectedFirstKey,
                  selectedItem.value,
                  selectedItem.contextItem,
                );
                setSelectedFirstKey(undefined);
                onOpenChange?.(false);
                onLostFocus?.();
              }
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
          } else {
            onOpenChange?.(false);
            onLostFocus?.();
          }
          break;
      }
    },
    [
      selectedFirstKey,
      secondLevelList,
      firstLevelList,
      selectedIndex,
      onSelect,
      onOpenChange,
      clearSearch,
      onLostFocus,
    ],
  );

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
            <span>{searchText}</span>
            {text}
          </React.Fragment>
        )),
      ];
      return renderedTexts;
    }
  };

  const renderItem = (item: SuggestionItem, index: number) => {
    const isSelected = selectedIndex === index;
    const isFirstLevel = !selectedFirstKey;
    const isSecondSeleted = isSecondItemSelected(item.value);

    return (
      <List.Item
        className={cx('p-0! select-none', {
          'bg-[#F5F6F7]': isSelected,
          'cursor-pointer': !isSecondSeleted,
          'cursor-not-allowed': !!isSecondSeleted,
        })}
        key={item.value}
        data-index={index}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={(e) => {
          if (selectedFirstKey) {
            if (isSecondSeleted) {
              e.preventDefault();
            } else {
              onSelect?.(selectedFirstKey, item.value, item.contextItem);
              setSelectedFirstKey(undefined);
              onOpenChange?.(false);
              onLostFocus?.();
            }
          } else {
            clearSearch(item.value);
            setSelectedFirstKey(item.value);
          }
        }}
      >
        <div className="flex justify-between items-center w-full px-3.5 py-1.5">
          <div className="flex gap-1 items-center h-5">
            <div>{item.icon}</div>
            <SmartText
              label={renderItemText(item.label, inputRef.current?.input?.value)}
              extra={
                item.extra
                  ? renderItemText(item.extra, inputRef.current?.input?.value)
                  : undefined
              }
              maxWidth={260}
              forceShowTip={isSelected}
              placement="top"
            />
          </div>
          {isFirstLevel && <ArrowRightOutlined />}
          {!isFirstLevel && isSecondSeleted && (
            <Icon component={CheckOutlined} className="text-[#7357FF]!" />
          )}
        </div>
      </List.Item>
    );
  };

  const handleBackClick = useCallback(() => setSelectedFirstKey(undefined), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedFirstKey) {
        const searchResults = onSearch?.(selectedFirstKey, e.target.value);
        setSearchResults(searchResults || undefined);
      }
    },
    [onSearch, selectedFirstKey],
  );

  const ListHeader = useMemo(() => {
    if (selectedFirstKey) {
      return (
        <div className="flex items-center justify-between h-5.5 pb-1 px-3.5 w-full">
          <Icon
            component={LeftOutlined}
            className="text-xs"
            onClick={handleBackClick}
          />
          <Input
            ref={inputRef}
            variant="borderless"
            autoFocus
            onChange={handleInputChange}
            placeholder={t('common.placeholder')}
          />
        </div>
      );
    }
    return null;
  }, [selectedFirstKey, handleBackClick, handleInputChange, t]);

  // Combined effect for popup state management
  useEffect(() => {
    if (open) {
      // Focus popup container when it opens
      if (popupRef.current) {
        popupRef.current.focus();
      }

      // Focus input when displaying second level list
      if (selectedFirstKey && inputRef.current) {
        inputRef.current.focus();
      }

      // Set default selection (first item)
      const currentList = selectedFirstKey ? secondLevelList : firstLevelList;
      setSelectedIndex(currentList.length > 0 ? 0 : -1);
    }
  }, [open, selectedFirstKey, firstLevelList, secondLevelList]);

  // Handle click outside to close popup
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
        onLostFocus?.();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange, selectedFirstKey, onLostFocus]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedItem = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement;

      if (selectedItem) {
        const listContainer =
          listRef.current.querySelector('.ant-list') || listRef.current;
        const containerRect = listContainer.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
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
      destroyOnHidden // must be set to true to get focus when each time the popup is opened
      content={() => (
        <div
          className="rounded-[10px] border border-[#eeeff0] bg-white py-2"
          ref={popupRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {ListHeader}
          <List
            className="w-85 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent hover:scrollbar-thumb-gray-400/60 scrollbar-thumb-rounded-full"
            ref={listRef}
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
