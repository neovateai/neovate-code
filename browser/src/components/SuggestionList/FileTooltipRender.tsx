import React from 'react';

interface Props {
  fullPath: React.ReactNode;
  icon: React.ReactNode;
}

const FileTooltipRender = (props: Props) => {
  const { fullPath, icon } = props;
  return (
    <div className="flex items-center gap-1 select-none">
      <div>{icon}</div>
      <div className="overflow-hidden whitespace-nowrap">{fullPath}</div>
    </div>
  );
};

export default FileTooltipRender;
