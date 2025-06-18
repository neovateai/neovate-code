import { PlusOutlined } from '@ant-design/icons';
import { Input, type InputRef, Tag } from 'antd';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const AddContext = () => {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setinputValue] = useState('');
  const inputRef = useRef<InputRef>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [tagSize, setTagSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  useLayoutEffect(() => {
    const rect = tagRef.current?.getBoundingClientRect();
    setTagSize({
      width: rect?.width || 0,
      height: rect?.height || 0,
    });
  }, []);

  return inputVisible ? (
    <Input
      ref={inputRef}
      style={{
        ...tagSize,
        marginRight: 8,
      }}
      onBlur={() => {
        setInputVisible(false);
        setinputValue('');
      }}
    />
  ) : (
    <Tag
      ref={tagRef}
      style={{
        userSelect: 'none',
        borderStyle: 'dashed',
        backgroundColor: 'inherit',
        lineHeight: 'inherit',
      }}
      icon={<PlusOutlined />}
      onClick={() => setInputVisible(true)}
    >
      Add Context
    </Tag>
  );
};

export default AddContext;
