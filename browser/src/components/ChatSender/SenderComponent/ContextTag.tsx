import Icon, { CloseCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
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
  /** 标签内容 */
  label: string;
  /** 标签图片 */
  image?: string;

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
  const { closeable, onClose, label, image, value, context, contextType } =
    props;

  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {closeable && hover && (
        <div
          className="float-end cursor-pointer relative right-3.5 bottom-1.5"
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
