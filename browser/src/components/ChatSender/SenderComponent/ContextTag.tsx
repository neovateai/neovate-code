import Icon, { CloseCircleFilled } from '@ant-design/icons';

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

  return (
    <div>
      <div>
        <Icon component={() => <CloseCircleFilled />} />
      </div>
      <div className="flex gap-1">
        <div>
          <Icon />
        </div>
        <div>{label}</div>
      </div>
    </div>
  );
};
