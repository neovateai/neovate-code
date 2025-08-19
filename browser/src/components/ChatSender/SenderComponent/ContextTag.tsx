import Icon, { CloseCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
import { cx } from 'antd-style';
import { useState } from 'react';
import type { FileItem } from '@/api/model';
import DevFileIcon from '@/components/DevFileIcon';
import { ContextType } from '@/constants/context';
import type { ContextStoreValue } from '@/types/context';

interface Props {
  /** 是否可关闭 */
  closeable?: boolean;
  /** 关闭回调 */
  onClose?: (val: string) => void;
  /** 点击回调 */
  onClick?: (val: string) => void;
  /** 标签内容 */
  label: string;
  /** 标签图片 */
  image?: string;
  /** 标签值，必须唯一 */
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
