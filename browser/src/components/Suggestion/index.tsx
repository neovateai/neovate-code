import useXComponentConfig from '@ant-design/x/es/_util/hooks/use-x-component-config';
import { useXProviderContext } from '@ant-design/x/es/x-provider';
import { Cascader, Flex, Input, type InputRef, version } from 'antd';
import type { CascaderProps } from 'antd';
import classnames from 'classnames';
import { useEvent, useMergedState } from 'rc-util';
import React, { useRef, useState } from 'react';
import useStyle from './style';
import useActive from './useActive';

const antdVersionCells = version.split('.').map(Number);
const isNewAPI =
  antdVersionCells[0] > 5 ||
  (antdVersionCells[0] === 5 && antdVersionCells[1] >= 25);

export type SuggestionItem = {
  label: React.ReactNode;
  value: string;

  icon?: React.ReactNode;

  children?: SuggestionItem[];

  extra?: React.ReactNode;
};

export interface RenderChildrenProps<T> {
  onTrigger: (info?: T | false) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export interface ShowSearchConfigs {
  placeholder?: string;
  /** 优先级高于items */
  onSearch: (text: string) => void;
}

export interface SuggestionProps<T = any> {
  prefixCls?: string;
  className?: string;
  rootClassName?: string;
  style?: React.CSSProperties;
  children?: (props: RenderChildrenProps<T>) => React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items: SuggestionItem[] | ((info?: T) => SuggestionItem[]);
  onSelect?: (value: string) => void;
  block?: boolean;
  styles?: Partial<Record<string, React.CSSProperties>>;
  classNames?: Partial<Record<string, string>>;

  outsideOpen?: boolean;

  // ============================= Search =============================
  showSearch?: ShowSearchConfigs | false;
}

function Suggestion<T = any>(props: SuggestionProps<T>) {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    children,
    open,
    onOpenChange,
    items,
    onSelect,
    block,
    showSearch,
    outsideOpen,
  } = props;

  // ============================= MISC =============================
  const { direction, getPrefixCls } = useXProviderContext();
  const prefixCls = getPrefixCls('suggestion', customizePrefixCls);
  const itemCls = `${prefixCls}-item`;

  const isRTL = direction === 'rtl';

  // ===================== Component Config =========================
  const contextConfig = useXComponentConfig('suggestion');

  // ============================ Styles ============================
  const [wrapCSSVar, hashId, cssVarCls] = useStyle(prefixCls);

  // =========================== Trigger ============================
  const [mergedOpen, setOpen] = useMergedState(false, {
    value: open,
  });
  const [info, setInfo] = useState<T | undefined>();

  const searchBoxRef = useRef<InputRef>(null);

  const triggerOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const onTrigger: RenderChildrenProps<T>['onTrigger'] = useEvent(
    (nextInfo) => {
      if (nextInfo === false) {
        triggerOpen(false);
      } else {
        setInfo(nextInfo);
        triggerOpen(true);
        if (showSearch) {
          searchBoxRef.current?.focus();
        }
      }
    },
  );

  const onClose = () => {
    triggerOpen(false);
  };

  // ============================ Items =============================
  const itemList = React.useMemo(
    () => (typeof items === 'function' ? items(info) : items),
    [items, info],
  );

  // =========================== Cascader ===========================
  const optionRender: CascaderProps<SuggestionItem>['optionRender'] = (
    node,
  ) => {
    return (
      <Flex className={itemCls}>
        {node.icon && <div className={`${itemCls}-icon`}>{node.icon}</div>}
        {node.label}
        {node.extra && <div className={`${itemCls}-extra`}>{node.extra}</div>}
      </Flex>
    );
  };

  const popupRender: CascaderProps<SuggestionItem>['popupRender'] = (menus) => {
    return (
      <div
        style={{
          padding: 4,
        }}
      >
        {/* TODO back button */}
        {showSearch && (
          <Input
            ref={searchBoxRef}
            style={{
              margin: '4px 0',
            }}
            size="small"
            variant="underlined"
            placeholder={showSearch?.placeholder}
            onChange={(e) => {
              showSearch.onSearch(e.target.value);
            }}
          />
        )}
        {menus}
      </div>
    );
  };

  const onInternalChange = (valuePath: string[]) => {
    if (onSelect) {
      const value = valuePath[valuePath.length - 1];

      onSelect(value);
    }
    triggerOpen(false);
  };

  // ============================= a11y =============================
  const [activePath, onKeyDown] = useActive(
    itemList,
    mergedOpen,
    isRTL,
    onInternalChange,
    onClose,
  );

  // =========================== Children ===========================
  const childNode = children?.({ onTrigger, onKeyDown });

  // ============================ Render ============================
  const onInternalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const compatibleProps: Pick<
    Partial<CascaderProps<SuggestionItem>>,
    'onDropdownVisibleChange' | 'onOpenChange'
  > = {};

  /* istanbul ignore else */
  if (isNewAPI) {
    compatibleProps.onOpenChange = onInternalOpenChange;
  } else {
    compatibleProps.onDropdownVisibleChange = onInternalOpenChange;
  }

  return wrapCSSVar(
    <Cascader
      options={itemList}
      open={mergedOpen || outsideOpen}
      value={activePath}
      popupRender={popupRender}
      placement={isRTL ? 'topRight' : 'topLeft'}
      {...compatibleProps}
      optionRender={optionRender}
      rootClassName={classnames(rootClassName, prefixCls, hashId, cssVarCls, {
        [`${prefixCls}-block`]: block,
      })}
      onChange={onInternalChange}
      dropdownMatchSelectWidth={block}
    >
      <div
        className={classnames(
          prefixCls,
          contextConfig.className,
          rootClassName,
          className,
          `${prefixCls}-wrapper`,
          hashId,
          cssVarCls,
        )}
        style={{
          ...contextConfig.style,
          ...style,
        }}
      >
        {childNode}
      </div>
    </Cascader>,
  );
}

if (process.env.NODE_ENV !== 'production') {
  Suggestion.displayName = 'Suggestion';
}

export default Suggestion;
