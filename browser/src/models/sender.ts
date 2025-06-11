import { useState } from 'react';

const useSender = () => {
  const [inputValue, setInputValue] = useState('');
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);

  return {
    inputValue,
    setInputValue,
    attachmentsOpen,
    setAttachmentsOpen,
    attachedFiles,
    setAttachedFiles,
  };
};

export default useSender;
