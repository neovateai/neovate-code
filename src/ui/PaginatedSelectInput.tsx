import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useState } from 'react';
import { symbols } from '../utils/symbols';

interface PaginatedSelectInputProps {
  items: Array<{ label: string; value: string }>;
  initialIndex?: number;
  itemsPerPage?: number;
  onSelect: (item: { label: string; value: string }) => void;
}

const PaginatedSelectInput: React.FC<PaginatedSelectInputProps> = ({
  items,
  initialIndex = 0,
  itemsPerPage = 10,
  onSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const currentPageItems = items.slice(startIndex, endIndex);
  const globalSelectedIndex = startIndex + selectedIndex;

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < items.length) {
      const targetPage = Math.floor(initialIndex / itemsPerPage);
      const targetIndex = initialIndex % itemsPerPage;
      setCurrentPage(targetPage);
      setSelectedIndex(targetIndex);
    }
  }, [initialIndex, itemsPerPage, items.length]);

  useInput((input, key) => {
    if (key.return) {
      if (items.length > 0 && globalSelectedIndex < items.length) {
        onSelect(items[globalSelectedIndex]);
      }
      return;
    }

    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        setSelectedIndex(itemsPerPage - 1);
      }
    }

    if (key.downArrow) {
      if (selectedIndex < currentPageItems.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      } else if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
        setSelectedIndex(0);
      }
    }

    if (key.pageUp || key.leftArrow) {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        setSelectedIndex(Math.min(selectedIndex, itemsPerPage - 1));
      }
    }

    if (key.pageDown || key.rightArrow) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
        const nextPageItems = items.slice(
          (currentPage + 1) * itemsPerPage,
          Math.min((currentPage + 2) * itemsPerPage, items.length),
        );
        setSelectedIndex(Math.min(selectedIndex, nextPageItems.length - 1));
      }
    }

    if (key.ctrl && input === 'home') {
      setCurrentPage(0);
      setSelectedIndex(0);
    }

    if (key.ctrl && input === 'end') {
      const lastPage = totalPages - 1;
      const lastPageItems = items.slice(lastPage * itemsPerPage, items.length);
      setCurrentPage(lastPage);
      setSelectedIndex(lastPageItems.length - 1);
    }
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {currentPageItems.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={startIndex + index}>
              <Text
                color={isSelected ? 'cyan' : undefined}
                inverse={isSelected}
              >
                {isSelected ? pc.cyan(`${symbols.pointer} `) : '  '}
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {totalPages > 1 && (
        <Box marginTop={1} justifyContent="space-between">
          <Text color="gray" dimColor>
            Page {currentPage + 1} of {totalPages}
          </Text>
          <Text color="gray" dimColor>
            Item {globalSelectedIndex + 1} of {items.length}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          {totalPages > 1
            ? '(↑↓: navigate, ←→: page, Enter: select, ESC: cancel)'
            : '(↑↓: navigate, Enter: select, ESC: cancel)'}
        </Text>
      </Box>
    </Box>
  );
};

export default PaginatedSelectInput;
