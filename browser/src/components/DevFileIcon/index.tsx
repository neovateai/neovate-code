import Icon, {
  FileImageOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import Css3Plain from 'devicons-react/icons/Css3Plain';
import Html5Plain from 'devicons-react/icons/Html5Plain';
import JavaScriptPlain from 'devicons-react/icons/JavascriptPlain';
import MarkdownOriginal from 'devicons-react/icons/MarkdownOriginal';
import NpmOriginalWordmark from 'devicons-react/icons/NpmOriginalWordmark';
import ReactOriginal from 'devicons-react/icons/ReactOriginal';
import TypescriptPlain from 'devicons-react/icons/TypescriptPlain';
import VuejsPlain from 'devicons-react/icons/VuejsPlain';
import YamlPlain from 'devicons-react/icons/YamlPlain';

function getPlainIcon(ext: string) {
  switch (ext) {
    case 'npmrc':
      return <NpmOriginalWordmark size={12} />;
    case 'css':
      return <Css3Plain size={12} />;
    case 'html':
      return <Html5Plain size={12} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <JavaScriptPlain size={12} />;
    case 'ts':
    case 'mts':
    case 'cts':
      return <TypescriptPlain size={12} />;
    case 'jsx':
    case 'tsx':
      return <ReactOriginal size={12} />;
    case 'md':
      return <MarkdownOriginal size={12} />;
    case 'vue':
      return <VuejsPlain size={12} />;
    case 'yaml':
      return <YamlPlain size={12} />;
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
