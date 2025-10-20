import {
  DatabaseOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FileZipOutlined,
  LockOutlined,
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
import FolderIcon from '@/icons/folder.svg?react';
import RightArrowIcon from '@/icons/rightArrow.svg?react';
import styles from './index.module.css';

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
    return <FolderIcon />;
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

  // flatten children count
  const childrenCount =
    item.children?.reduce(
      (acc, child) => acc + (child.children?.length || 0),
      0,
    ) || 0;

  const toggleExpand = () => {
    if (childrenCount > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <li className={styles.itemContainer} onClick={toggleExpand}>
        <span
          className={styles.itemIcon}
          style={{
            transform:
              childrenCount > 0 && isExpanded
                ? 'rotate(90deg)'
                : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          {childrenCount > 0 && <RightArrowIcon />}
        </span>
        <span className={styles.itemIcon}>
          {item.isDirectory ? <FolderIcon /> : getIconForFile(item.name)}
        </span>
        <span className={styles.itemTitle}>
          {showPath ? item.name : item.name.split('/').pop()}
        </span>
        <span className={styles.itemCount}>
          {childrenCount > 0 ? childrenCount : null}
        </span>
      </li>
      {childrenCount > 0 && isExpanded && (
        <ul className={styles.listContainer}>
          {item.children?.map((child, index) => (
            <RenderItem
              key={`${item.name}-${index}`}
              item={child}
              showPath={showPath}
            />
          ))}
        </ul>
      )}
    </>
  );
};

export default function InnerList({ items, showPath = true }: InnerListProps) {
  return (
    <ul className={styles.listContainer}>
      {items.map((item) => (
        <RenderItem key={item.name} item={item} showPath={showPath} />
      ))}
    </ul>
  );
}
