import React from 'react';
import ReactMarkdown from 'react-markdown';

interface StringMessageRendererProps {
  message: string;
}

const StringMessageRenderer: React.FC<StringMessageRendererProps> = ({
  message,
}) => {
  return <ReactMarkdown>{message}</ReactMarkdown>;
};

export default StringMessageRenderer;
