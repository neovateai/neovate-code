import Icon, {
  FileImageOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import {
  SiCss3,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiMarkdown,
  SiNpm,
  SiReact,
  SiTypescript,
  SiVuedotjs,
  SiYaml,
} from 'react-icons/si';

function getPlainIcon(ext: string, size: number) {
  switch (ext) {
    case 'json':
      return <SiJson size={size} />;
    case 'npmrc':
      return <SiNpm size={size} />;
    case 'css':
      return <SiCss3 size={size} />;
    case 'html':
      return <SiHtml5 size={size} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <SiJavascript size={size} />;
    case 'ts':
    case 'mts':
    case 'cts':
      return <SiTypescript size={size} />;
    case 'jsx':
    case 'tsx':
      return <SiReact size={size} />;
    case 'md':
      return <SiMarkdown size={size} />;
    case 'vue':
      return <SiVuedotjs size={size} />;
    case 'yaml':
      return <SiYaml size={size} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImageOutlined size={size} />;
    default:
      return <FileOutlined size={size} />;
  }
}

const DevFileIcon = ({
  isFolder,
  fileExt,
  style,
  className,
  size = 12,
}: {
  isFolder?: boolean;
  fileExt: string;
  style?: React.CSSProperties;
  className?: string;
  size?: number;
}) => {
  return (
    <Icon
      component={() => {
        if (isFolder) {
          return <FolderOutlined />;
        } else {
          return getPlainIcon(fileExt.toLowerCase(), size);
        }
      }}
      style={style}
      className={className}
    />
  );
};

export default DevFileIcon;
