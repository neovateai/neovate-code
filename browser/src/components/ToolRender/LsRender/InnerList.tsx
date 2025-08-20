/**
 * 渲染toolRender中涉及到list展示的组件
 */
import {
  DatabaseOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FolderOutlined,
  LockOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { FaJava } from 'react-icons/fa';
import {
  SiCss3,
  SiDocker,
  SiGit,
  SiGo,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiKotlin,
  SiPhp,
  SiPython,
  SiRuby,
  SiSwift,
  SiTypescript,
  SiYaml,
} from 'react-icons/si';

export interface ListItem {
  name: string;
  isDirectory?: boolean;
  children?: ListItem[];
  level?: number;
}

interface InnerListProps {
  items: ListItem[];
  showPath?: boolean;
}

const getIconForFile = (filename: string) => {
  if (filename.endsWith('/')) {
    return <FolderOutlined />;
  }

  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'ts':
    case 'tsx':
      return <SiTypescript color="#3178c6" />;
    case 'js':
    case 'jsx':
      return <SiJavascript color="#f7df1e" />;
    case 'html':
      return <SiHtml5 color="#e34f26" />;
    case 'css':
      return <SiCss3 color="#1572b6" />;
    case 'json':
      return <SiJson color="#000000" />;
    case 'md':
      return <FileMarkdownOutlined />;
    case 'yaml':
    case 'yml':
      return <SiYaml color="#cb171e" />;
    case 'py':
      return <SiPython color="#3776ab" />;
    case 'java':
      return <FaJava color="#007396" />;
    case 'go':
      return <SiGo color="#00add8" />;
    case 'rb':
      return <SiRuby color="#cc342d" />;
    case 'php':
      return <SiPhp color="#777bb4" />;
    case 'swift':
      return <SiSwift color="#f05138" />;
    case 'kt':
    case 'kts':
      return <SiKotlin color="#7f52ff" />;
    case 'lock':
      return <LockOutlined />;
    case 'env':
      return <FileProtectOutlined />;
    case 'dockerfile':
      return <SiDocker color="#2496ed" />;
    case 'gitignore':
      return <SiGit color="#f05032" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImageOutlined />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileZipOutlined />;
    case 'sql':
      return <DatabaseOutlined />;
    case 'txt':
      return <FileTextOutlined />;
    default:
      return <FileOutlined />;
  }
};

const RenderItem = ({
  item,
  showPath,
}: {
  item: ListItem;
  showPath: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = item.children && item.children.length > 0;

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <li
        className="flex text-xs truncate items-center gpa-1 p-1 rounded cursor-pointer hover:bg-gray-100"
        onClick={toggleExpand}
      >
        <span
          className="text-gray-500 w-4 h-4 flex items-center justify-center"
          style={{
            transform:
              hasChildren && isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          {hasChildren ? (
            <RightOutlined />
          ) : (
            <span className="inline-block w-4" />
          )}
        </span>
        <span className="text-gray-500 w-4 h-4 flex items-center justify-center">
          {item.isDirectory ? <FolderOutlined /> : getIconForFile(item.name)}
        </span>
        <span className={item.isDirectory ? 'text-blue-600' : ''}>
          {showPath ? item.name : item.name.split('/').pop()}
        </span>
      </li>
      {hasChildren && isExpanded && (
        <ul className="list-none m-0 p-0 pl-4">
          {item.children?.map((child, index) => (
            <RenderItem key={index} item={child} showPath={showPath} />
          ))}
        </ul>
      )}
    </>
  );
};

export default function InnerList({ items, showPath = true }: InnerListProps) {
  console.log('items', items);
  return (
    <ul className="list-none m-0 p-0">
      {items.map((item, index) => (
        <RenderItem key={index} item={item} showPath={showPath} />
      ))}
    </ul>
  );
}
