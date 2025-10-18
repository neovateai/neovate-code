import { cx } from 'antd-style';
import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';

export const SenderButton = (
  props: DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >,
) => {
  const { className, ...rest } = props;

  return (
    <button
      className={cx(
        'text-[#110C22] text-center text-xs',
        'border border-[#F0F2F5]',
        'rounded-[50px] h-4 box-content py-2 px-3 flex justify-center items-center gap-1',
        'cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
};
