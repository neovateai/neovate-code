import Icon, { AppstoreOutlined, CloseCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
import { cx } from 'antd-style';
import { useState } from 'react';
import type { FileItem } from '@/api/model';
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
  /** Tag image */
  image?: string;
  /** Tag value, must be unique */
  value: string;

  context?: ContextStoreValue;

  contextType?: ContextType;
}

function renderIcon(type?: ContextType, context?: ContextStoreValue) {
  if (!context || !type) {
    return null;
  }
  switch (type) {
    case ContextType.FILE:
      const fileExt = (context as FileItem).name.split('.').pop() ?? '';
      const isFolder = (context as FileItem).type === 'directory';
      return <DevFileIcon fileExt={fileExt} isFolder={isFolder} />;
    case ContextType.SLASH_COMMAND:
      return <AppstoreOutlined />;
  }
}

export const SenderContextTag = (props: Props) => {
  const {
    closeable,
    onClose,
    onClick,
    label,
    image,
    value,
    context,
    contextType,
  } = props;

  const [hover, setHover] = useState(false);

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
      <Popover
        title={image && <img src={image} className="max-w-xl max-h-120" />}
      >
        <div className="flex items-center gap-1 rounded-[50px] py-2 px-3 bg-[#F7F8FA] text-[#110C22] text-xs select-none">
          <div>
            {image ? (
              <img
                src={image}
                width={30}
                height={20}
                className="rounded-2xl h-5 w-7.5"
              />
            ) : (
              renderIcon(contextType, context)
            )}
          </div>
          <div>{label}</div>
        </div>
      </Popover>
    </div>
  );
};
