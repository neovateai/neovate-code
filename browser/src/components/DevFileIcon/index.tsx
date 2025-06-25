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

function getPlainIcon(ext: string) {
  switch (ext) {
    case 'json':
      return <SiJson size={12} />;
    case 'npmrc':
      return <SiNpm size={12} />;
    case 'css':
      return <SiCss3 size={12} />;
    case 'html':
      return <SiHtml5 size={12} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <SiJavascript size={12} />;
    case 'ts':
    case 'mts':
    case 'cts':
      return <SiTypescript size={12} />;
    case 'jsx':
    case 'tsx':
      return <SiReact size={12} />;
    case 'md':
      return <SiMarkdown size={12} />;
    case 'vue':
      return <SiVuedotjs size={12} />;
    case 'yaml':
      return <SiYaml size={12} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImageOutlined size={12} />;
    default:
      return <FileOutlined size={12} />;
  }
}

const DevFileIcon = ({
  isFolder,
  fileExt,
  style,
  className,
}: {
  isFolder?: boolean;
  fileExt: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <Icon
      component={() => {
        if (isFolder) {
          return <FolderOutlined />;
        } else {
          return getPlainIcon(fileExt.toLowerCase());
        }
      }}
      style={style}
      className={className}
    />
  );
};

export default DevFileIcon;
