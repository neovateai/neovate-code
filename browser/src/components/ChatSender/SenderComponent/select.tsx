import { type GetProps, Select } from 'antd';
import { cx } from 'antd-style';

interface Props extends GetProps<typeof Select> {}

export const SenderSelect = (props: Props) => {
  const { className, ...rest } = props;
  return (
    <Select
      className={cx('', className)}
      classNames={{
        root: cx('[&_.ant-select-selector]:rounded-[50px]!'),
      }}
      {...rest}
    />
  );
};
