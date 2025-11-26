import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface GroupedItem {
  name: string;
  modelId: string;
  value: string;
}

interface GroupedData {
  provider: string;
  providerId: string;
  models: GroupedItem[];
}

interface PaginatedGroupSelectInputProps {
  groups: GroupedData[];
  initialValue?: string;
  itemsPerPage?: number;
  enableSearch?: boolean;
  onSelect: (item: GroupedItem) => void;
  onCancel?: () => void;
}

// Internal component interfaces
type FlatItem = GroupedItem & {
  isHeader?: boolean;
  provider?: string;
  isSeparator?: boolean;
  label?: string;
};

interface SearchInputDisplayProps {
  searchMode: boolean;
  searchQuery: string;
  hasResults: boolean;
}

interface ListItemRendererProps {
  item: FlatItem;
  index: number;
  isSelected: boolean;
  startIndex: number;
}

interface SelectedItemInfoProps {
  selectedProvider: string | null;
  selectedItem: FlatItem | null;
}

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  globalSelectedIndex: number;
  totalItems: number;
}

interface HelpTextProps {
  searchMode: boolean;
  enableSearch: boolean;
  totalPages: number;
}

interface SearchLogicReturn {
  searchMode: boolean;
  searchQuery: string;
  filteredGroups: GroupedData[];
  setSearchMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  hasResults: boolean;
}

interface PaginationLogicReturn {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  currentPageItems: FlatItem[];
  setCurrentPage: (page: number) => void;
  flatItems: FlatItem[];
}

interface SelectionLogicReturn {
  selectedIndex: number;
  globalSelectedIndex: number;
  selectedItem: FlatItem | null;
  selectedProvider: string | null;
  setSelectedIndex: (index: number) => void;
  navigateToItem: (targetGlobalIndex: number) => {
    targetPage: number;
    targetIndexInPage: number;
  };
}

// Custom Hooks
// Memoized search function for better performance with large datasets
const filterGroupsByQuery = (
  groups: GroupedData[],
  query: string,
): GroupedData[] => {
  if (!query.trim()) {
    return groups;
  }

  const lowerSearchQuery = query.toLowerCase();

  return groups
    .map((group) => {
      const filteredModels = group.models.filter((model) => {
        const matchName = model.name.toLowerCase().includes(lowerSearchQuery);
        const matchModelId = model.modelId
          .toLowerCase()
          .includes(lowerSearchQuery);
        const matchProvider = group.provider
          .toLowerCase()
          .includes(lowerSearchQuery);
        return matchName || matchModelId || matchProvider;
      });

      return {
        ...group,
        models: filteredModels,
      };
    })
    .filter((group) => group.models.length > 0);
};

const useSearchLogic = (groups: GroupedData[]): SearchLogicReturn => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prevSearchModeRef = useRef(searchMode);

  const filteredGroups = useMemo(() => {
    // Use extracted function for better performance and readability
    return filterGroupsByQuery(groups, searchQuery);
  }, [groups, searchQuery]);

  const hasResults = filteredGroups.length > 0;

  useEffect(() => {
    prevSearchModeRef.current = searchMode;
  }, [searchMode]);

  return {
    searchMode,
    searchQuery,
    filteredGroups,
    setSearchMode,
    setSearchQuery,
    hasResults,
  };
};

// Extract flatItems calculation to improve performance
const createFlatItems = (groups: GroupedData[]): FlatItem[] => {
  const items: FlatItem[] = [];
  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      items.push({
        name: '',
        modelId: '',
        value: '',
        label: '',
        isSeparator: true,
      });
    }
    items.push({
      name: '',
      modelId: '',
      label: group.provider,
      value: '',
      isHeader: true,
      provider: group.provider,
    });
    group.models.forEach((model) => {
      items.push({
        ...model,
        label: `${model.name} → ${pc.gray(`(${model.modelId})`)}`,
        provider: group.provider,
      });
    });
  });
  return items;
};

const usePaginationLogic = (
  filteredGroups: GroupedData[],
  itemsPerPage: number,
): PaginationLogicReturn => {
  const [currentPage, setCurrentPage] = useState(0);

  const flatItems: FlatItem[] = useMemo(() => {
    // Use extracted function for better readability and potential optimization
    return createFlatItems(filteredGroups);
  }, [filteredGroups]);

  const totalPages = Math.ceil(flatItems.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, flatItems.length);
  const currentPageItems = flatItems.slice(startIndex, endIndex);

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    currentPageItems,
    setCurrentPage,
    flatItems,
  };
};

const useSelectionLogic = (
  flatItems: FlatItem[],
  startIndex: number,
  itemsPerPage: number,
  initialValue?: string,
  onPageChange?: (page: number) => void,
): SelectionLogicReturn => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const globalSelectedIndex = startIndex + selectedIndex;
  const selectedItem = flatItems[globalSelectedIndex] || null;

  const selectedProvider = useMemo(() => {
    if (selectedItem && !selectedItem.isHeader && !selectedItem.isSeparator) {
      return selectedItem.provider || null;
    }
    return null;
  }, [selectedItem]);

  const navigateToItem = (targetGlobalIndex: number) => {
    const targetPage = Math.floor(targetGlobalIndex / itemsPerPage);
    const targetIndexInPage = targetGlobalIndex % itemsPerPage;
    return { targetPage, targetIndexInPage };
  };

  useEffect(() => {
    if (initialValue) {
      const targetIndex = flatItems.findIndex(
        (item) => item.value === initialValue,
      );
      if (targetIndex >= 0) {
        const { targetPage, targetIndexInPage } = navigateToItem(targetIndex);
        setSelectedIndex(targetIndexInPage);
        onPageChange?.(targetPage);
      }
    } else {
      const firstModelIndex = flatItems.findIndex(
        (item) => !item.isHeader && !item.isSeparator,
      );
      if (firstModelIndex >= 0) {
        const { targetPage, targetIndexInPage } =
          navigateToItem(firstModelIndex);
        setSelectedIndex(targetIndexInPage);
        onPageChange?.(targetPage);
      }
    }
  }, [initialValue, itemsPerPage, flatItems.length, onPageChange]);

  return {
    selectedIndex,
    globalSelectedIndex,
    selectedItem,
    selectedProvider,
    setSelectedIndex,
    navigateToItem,
  };
};

const useKeyboardNavigation = (
  searchLogic: SearchLogicReturn,
  paginationLogic: PaginationLogicReturn,
  selectionLogic: SelectionLogicReturn,
  enableSearch: boolean,
  itemsPerPage: number,
  initialValue?: string,
  onSelect?: (item: GroupedItem) => void,
  onCancel?: () => void,
) => {
  const prevSearchModeRef = useRef(searchLogic.searchMode);

  useEffect(() => {
    if (searchLogic.searchMode) {
      paginationLogic.setCurrentPage(0);
      selectionLogic.setSelectedIndex(0);
    }
  }, [searchLogic.searchQuery]);

  useEffect(() => {
    const wasInSearchMode = prevSearchModeRef.current;
    const isNowInSearchMode = searchLogic.searchMode;

    if (wasInSearchMode && !isNowInSearchMode) {
      searchLogic.setSearchQuery('');
      if (initialValue) {
        const targetIndex = paginationLogic.flatItems.findIndex(
          (item) => item.value === initialValue,
        );
        if (targetIndex >= 0) {
          const { targetPage, targetIndexInPage } =
            selectionLogic.navigateToItem(targetIndex);
          paginationLogic.setCurrentPage(targetPage);
          selectionLogic.setSelectedIndex(targetIndexInPage);
        }
      }
    }

    prevSearchModeRef.current = searchLogic.searchMode;
  }, [
    searchLogic.searchMode,
    initialValue,
    itemsPerPage,
    paginationLogic.flatItems,
  ]);

  useInput((input, key) => {
    // Priority 1: Handle escape key (works in all modes)
    if (key.escape) {
      if (searchLogic.searchMode) {
        searchLogic.setSearchMode(false);
        searchLogic.setSearchQuery('');
        return;
      } else if (onCancel) {
        onCancel();
        return;
      }
    }

    // Priority 2: Handle return key (works in all modes)
    if (key.return) {
      const selectedItem =
        paginationLogic.flatItems[selectionLogic.globalSelectedIndex];

      if (
        selectedItem &&
        !selectedItem.isHeader &&
        !selectedItem.isSeparator &&
        onSelect
      ) {
        onSelect(selectedItem);
      }
      return;
    }

    // Priority 3: Handle search mode activation (only when not in search mode)
    if (!searchLogic.searchMode && enableSearch && input === '/') {
      searchLogic.setSearchMode(true);
      paginationLogic.setCurrentPage(0);
      selectionLogic.setSelectedIndex(0);
      return;
    }

    // Priority 4: Handle navigation keys (works in all modes)
    if (key.upArrow) {
      let targetGlobalIndex = selectionLogic.globalSelectedIndex - 1;

      while (targetGlobalIndex >= 0) {
        const item = paginationLogic.flatItems[targetGlobalIndex];
        if (item && !item.isHeader && !item.isSeparator) {
          break;
        }
        targetGlobalIndex--;
      }

      if (targetGlobalIndex >= 0) {
        const { targetPage, targetIndexInPage } =
          selectionLogic.navigateToItem(targetGlobalIndex);
        paginationLogic.setCurrentPage(targetPage);
        selectionLogic.setSelectedIndex(targetIndexInPage);
      }
      return;
    }

    if (key.downArrow) {
      let targetGlobalIndex = selectionLogic.globalSelectedIndex + 1;

      while (targetGlobalIndex < paginationLogic.flatItems.length) {
        const item = paginationLogic.flatItems[targetGlobalIndex];
        if (item && !item.isHeader && !item.isSeparator) {
          break;
        }
        targetGlobalIndex++;
      }

      if (targetGlobalIndex < paginationLogic.flatItems.length) {
        const { targetPage, targetIndexInPage } =
          selectionLogic.navigateToItem(targetGlobalIndex);
        paginationLogic.setCurrentPage(targetPage);
        selectionLogic.setSelectedIndex(targetIndexInPage);
      }
      return;
    }

    if (key.pageUp || key.leftArrow) {
      if (paginationLogic.currentPage > 0) {
        paginationLogic.setCurrentPage(paginationLogic.currentPage - 1);
        selectionLogic.setSelectedIndex(
          Math.min(selectionLogic.selectedIndex, itemsPerPage - 1),
        );
      }
      return;
    }

    if (key.pageDown || key.rightArrow) {
      if (paginationLogic.currentPage < paginationLogic.totalPages - 1) {
        paginationLogic.setCurrentPage(paginationLogic.currentPage + 1);
        const nextPageItems = paginationLogic.flatItems.slice(
          (paginationLogic.currentPage + 1) * itemsPerPage,
          Math.min(
            (paginationLogic.currentPage + 2) * itemsPerPage,
            paginationLogic.flatItems.length,
          ),
        );
        selectionLogic.setSelectedIndex(
          Math.min(selectionLogic.selectedIndex, nextPageItems.length - 1),
        );
      }
      return;
    }

    if (key.ctrl && input === 'home') {
      paginationLogic.setCurrentPage(0);
      selectionLogic.setSelectedIndex(0);
      return;
    }

    if (key.ctrl && input === 'end') {
      const lastPage = paginationLogic.totalPages - 1;
      const lastPageItems = paginationLogic.flatItems.slice(
        lastPage * itemsPerPage,
        paginationLogic.flatItems.length,
      );
      paginationLogic.setCurrentPage(lastPage);
      selectionLogic.setSelectedIndex(lastPageItems.length - 1);
      return;
    }

    // Priority 5: Handle search mode specific keys (backspace/delete)
    if (searchLogic.searchMode) {
      if (key.backspace || key.delete) {
        const newQuery = searchLogic.searchQuery.slice(0, -1);
        searchLogic.setSearchQuery(newQuery);
        return;
      }
    }

    // Priority 6: Handle character input (only in search mode and only printable characters)
    if (searchLogic.searchMode && input && input.length === 1) {
      // Only accept printable ASCII characters (32-126) and common extended characters
      const charCode = input.charCodeAt(0);
      const isPrintable =
        (charCode >= 32 && charCode <= 126) || charCode >= 160;

      // Exclude control characters and special keys
      if (isPrintable && !key.ctrl && !key.meta) {
        const newQuery = searchLogic.searchQuery + input;
        searchLogic.setSearchQuery(newQuery);
        return;
      }
    }

    // Remove the duplicated navigation logic since it was moved above
  });
};

// UI Components
const SearchInputDisplay: React.FC<SearchInputDisplayProps> = ({
  searchMode,
  searchQuery,
  hasResults,
}) => {
  if (!searchMode) return null;

  return (
    <>
      <Box marginBottom={1}>
        <Text color="yellow">🔍 Search: </Text>
        <Text color="cyan">{searchQuery}</Text>
        <Text color="gray">{searchQuery ? '' : '|'}</Text>
      </Box>
      {!hasResults && searchQuery && (
        <Box marginBottom={1}>
          <Text color="red">No models found for "{searchQuery}"</Text>
        </Box>
      )}
    </>
  );
};

const ListItemRenderer: React.FC<ListItemRendererProps> = ({
  item,
  index,
  isSelected,
  startIndex,
}) => {
  if (item.isSeparator) {
    return (
      <Box key={startIndex + index}>
        <Text color="gray">{pc.gray('─'.repeat(40))}</Text>
      </Box>
    );
  }

  if (item.isHeader) {
    return (
      <Box key={startIndex + index}>
        <Text bold color="magenta">
          ▸ {item.label}
        </Text>
      </Box>
    );
  }

  return (
    <Box key={startIndex + index}>
      <Text color={isSelected ? 'cyan' : undefined} inverse={isSelected}>
        {isSelected ? pc.cyan('  ▹ ') : '    '}
        {item.label}
      </Text>
    </Box>
  );
};

const SelectedItemInfo: React.FC<SelectedItemInfoProps> = ({
  selectedProvider,
  selectedItem,
}) => {
  if (
    !selectedProvider ||
    !selectedItem ||
    selectedItem.isHeader ||
    selectedItem.isSeparator
  ) {
    return null;
  }

  return (
    <Box marginTop={1}>
      <Text color="gray">
        <Text bold color="magenta">
          {selectedProvider}
        </Text>{' '}
        {pc.gray('➤')} <Text color="white">{selectedItem.name}</Text>
      </Text>
    </Box>
  );
};

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  globalSelectedIndex,
  totalItems,
}) => {
  if (totalPages <= 1) return null;

  return (
    <Box marginTop={1} justifyContent="space-between">
      <Text color="gray" dimColor>
        Page {currentPage + 1} of {totalPages}
      </Text>
      <Text color="gray" dimColor>
        Item {globalSelectedIndex + 1} of {totalItems}
      </Text>
    </Box>
  );
};

const HelpText: React.FC<HelpTextProps> = ({
  searchMode,
  enableSearch,
  totalPages,
}) => {
  const helpMessage = searchMode
    ? '(type to search, ESC: exit search, ↑↓: navigate, Enter: select)'
    : enableSearch && totalPages > 1
      ? '(/: search, ↑↓: navigate, ←→: page, Enter: select, ESC: cancel)'
      : enableSearch
        ? '(/: search, ↑↓: navigate, Enter: select, ESC: cancel)'
        : totalPages > 1
          ? '(↑↓: navigate, ←→: page, Enter: select, ESC: cancel)'
          : '(↑↓: navigate, Enter: select, ESC: cancel)';

  return (
    <Box marginTop={1}>
      <Text color="gray">{helpMessage}</Text>
    </Box>
  );
};

const PaginatedGroupSelectInput: React.FC<PaginatedGroupSelectInputProps> = ({
  groups,
  initialValue,
  itemsPerPage = 10,
  enableSearch = false,
  onSelect,
  onCancel,
}) => {
  const searchLogic = useSearchLogic(groups);
  const paginationLogic = usePaginationLogic(
    searchLogic.filteredGroups,
    itemsPerPage,
  );
  const selectionLogic = useSelectionLogic(
    paginationLogic.flatItems,
    paginationLogic.startIndex,
    itemsPerPage,
    initialValue,
    paginationLogic.setCurrentPage,
  );

  useKeyboardNavigation(
    searchLogic,
    paginationLogic,
    selectionLogic,
    enableSearch,
    itemsPerPage,
    initialValue,
    onSelect,
    onCancel,
  );

  return (
    <Box flexDirection="column">
      <SearchInputDisplay
        searchMode={searchLogic.searchMode}
        searchQuery={searchLogic.searchQuery}
        hasResults={searchLogic.hasResults}
      />

      <Box flexDirection="column">
        {paginationLogic.currentPageItems.map((item, index) => (
          <ListItemRenderer
            key={paginationLogic.startIndex + index}
            item={item}
            index={index}
            isSelected={index === selectionLogic.selectedIndex}
            startIndex={paginationLogic.startIndex}
          />
        ))}
      </Box>

      <SelectedItemInfo
        selectedProvider={selectionLogic.selectedProvider}
        selectedItem={selectionLogic.selectedItem}
      />

      <PaginationInfo
        currentPage={paginationLogic.currentPage}
        totalPages={paginationLogic.totalPages}
        globalSelectedIndex={selectionLogic.globalSelectedIndex}
        totalItems={paginationLogic.flatItems.length}
      />

      <HelpText
        searchMode={searchLogic.searchMode}
        enableSearch={enableSearch}
        totalPages={paginationLogic.totalPages}
      />
    </Box>
  );
};

export default PaginatedGroupSelectInput;
