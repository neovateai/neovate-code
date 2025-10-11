import Icon, { AppstoreOutlined, CloseCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
import { cx } from 'antd-style';
import { useMemo, useState } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import DevFileIcon from '@/components/DevFileIcon';
import { ContextType } from '@/constants/context';
import type { ContextStoreValue } from '@/types/context';

interface Props {
  /** Whether it can be closed */
  closeable?: boolean;
  /** Close callback */
  onClose?: (val: string) => void;
  /** Click callback */
  onClick?: (val: string) => void;
  /** Tag content */
  label: string;
  /** Tag value, must be unique */
  value: string;

  context?: ContextStoreValue;

  contextType?: ContextType;
}

export const SenderContextTag = (props: Props) => {
  const { closeable, onClose, onClick, label, value, context, contextType } =
    props;

  const [hover, setHover] = useState(false);

  const icon = useMemo(() => {
    if (!context || !contextType) {
      return null;
    }
    switch (contextType) {
      case ContextType.FILE:
        const fileExt = (context as FileItem).name.split('.').pop() ?? '';
        const isFolder = (context as FileItem).type === 'directory';
        return <DevFileIcon fileExt={fileExt} isFolder={isFolder} />;
      case ContextType.SLASH_COMMAND:
        return <AppstoreOutlined />;
      case ContextType.IMAGE:
        const imageSrc = (context as ImageItem).src;
        return (
          <img
            src={imageSrc}
            width={30}
            height={20}
            className="rounded-2xl h-5 w-7.5 select-none pointer-events-none"
            draggable={false}
          />
        );
      default:
        return null;
    }
  }, [context, contextType]);

  const popoverContent = useMemo(() => {
    switch (contextType) {
      case ContextType.IMAGE:
        const imageSrc = (context as ImageItem).src;
        return (
          <img
            src={imageSrc}
            className="max-w-xl max-h-120 select-none pointer-events-none"
            draggable={false}
          />
        );
      case ContextType.FILE:
        return (context as FileItem).path;
      default:
        return null;
    }
  }, [contextType, context]);

  return (
    <div
      className={cx('relative', { 'cursor-pointer': !!onClick })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick?.(value)}
    >
      {closeable && hover && (
        <div
          className="absolute cursor-pointer -top-1.5 -right-1.5 z-10"
          onClick={() => {
            onClose?.(value);
          }}
        >
          <Icon component={() => <CloseCircleFilled />} />
        </div>
      )}
      <Popover content={popoverContent}>
        <div className="flex items-center gap-1 rounded-[50px] py-2 px-3 bg-[#F7F8FA] text-[#110C22] text-xs select-none h-full">
          <div>{icon}</div>
          <div>{label}</div>
        </div>
      </Popover>
    </div>
  );
};
