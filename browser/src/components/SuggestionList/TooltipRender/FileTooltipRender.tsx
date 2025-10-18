import React from 'react';

interface Props {
  fullPath: React.ReactNode;
  icon: React.ReactNode;
}

const FileTooltipRender = (props: Props) => {
  const { fullPath, icon } = props;
  return (
    <div className="flex items-baseline gap-1 select-none max-w-110">
      <div>{icon}</div>
      <div className="overflow-hidden">{fullPath}</div>
    </div>
  );
};

export default FileTooltipRender;
