import Icon, { CloseCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
import { useState } from 'react';

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
}

export const SenderContextTag = (props: Props) => {
  const { closeable, onClose, label, image, value } = props;

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
            {/* TODO Icon */}
            {image ? (
              <img
                src={image}
                width={30}
                height={20}
                className="rounded-2xl h-5 w-7.5"
              />
            ) : (
              <Icon />
            )}
          </div>
          <div>{label}</div>
        </div>
      </Popover>
    </div>
  );
};
