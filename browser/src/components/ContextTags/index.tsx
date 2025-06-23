import Icon, {
  BookOutlined,
  CloseOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Image, Popover, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import DevFileIcon from '../DevFileIcon';

const useStyle = createStyles(({ css }) => {
  return {
    icon: css`
      margin-right: 4px;
      width: 12px;
      height: 12px;
    `,
    tag: css`
      user-select: none;
      margin: 0 2px;
      line-height: inherit;
    `,
  };
});

export const FileContextTag = ({
  displayText,
  onClose,
  context,
}: {
  displayText: string;
  onClose?: () => void;
  context?: FileItem;
}) => {
  const [hover, setHover] = useState(false);

  const { styles } = useStyle();

  return (
    <Tag
      color="blue"
      className={styles.tag}
      data-ai-context-id="file"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <DevFileIcon
          isFolder={context?.type === 'directory'}
          className={styles.icon}
          fileExt={displayText.split('.').pop() ?? ''}
        />
      )}
      {displayText}
    </Tag>
  );
};

export const CodeContextTag = ({
  displayText,
  onClose,
}: {
  displayText: string;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      color="green"
      className={styles.tag}
      data-ai-context-id="code"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <CodeOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};

export const ImageContextTag = ({
  displayText,
  onClose,
  context,
}: {
  displayText: string;
  onClose?: () => void;
  context?: ImageItem;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Popover
      popupVisible={hover}
      content={
        <Image
          style={{
            maxHeight: 600,
            maxWidth: 600,
          }}
          src={context?.src}
          preview={false}
        />
      }
    >
      <Tag
        color="cyan"
        className={styles.tag}
        data-ai-context-id="image"
        contentEditable={false}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {onClose && hover ? (
          <CloseOutlined className={styles.icon} onClick={onClose} />
        ) : (
          <Icon
            className={styles.icon}
            component={() => (
              <Image
                src={context?.src}
                width={12}
                height={12}
                preview={false}
              />
            )}
          />
        )}
        {displayText}
      </Tag>
    </Popover>
  );
};

export const UploadFileContextTag = ({
  displayText,
  onClose,
}: {
  displayText: string;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      color="purple"
      className={styles.tag}
      data-ai-context-id="upload-file"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <BookOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};
