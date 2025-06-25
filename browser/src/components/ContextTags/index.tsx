import Icon, { CloseOutlined, FileUnknownOutlined } from '@ant-design/icons';
import { Image, Popover, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import * as codeViewer from '@/state/codeViewer';
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

  const isFile = context?.type === 'file';

  return (
    <Tag
      color="blue"
      className={styles.tag}
      style={{ cursor: isFile ? 'pointer' : undefined }}
      data-ai-context-id="file"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        if (isFile) {
          codeViewer.actions.displayNormalViewer({
            path: displayText,
            code: '// TODO',
          });
        }
      }}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <DevFileIcon
          isFolder={!isFile}
          className={styles.icon}
          fileExt={displayText.split('.').pop() ?? ''}
        />
      )}
      {displayText}
    </Tag>
  );
};

export const AttachmentContextTag = ({
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
      data-ai-context-id="attachment"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <FileUnknownOutlined className={styles.icon} />
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
