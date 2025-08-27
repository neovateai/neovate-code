import React from 'react';

interface Props {
  label: React.ReactNode;
  extra: React.ReactNode;
  icon: React.ReactNode;
}

const FileTooltipRender = (props: Props) => {
  const { label, extra, icon } = props;
  return (
    <div className="flex items-center gap-1 select-none">
      <div>{icon}</div>
      <div className="flex items-center">
        <div className="overflow-hidden whitespace-nowrap">{extra}</div>
        <div>/</div>
        <div className="overflow-hidden whitespace-nowrap">{label}</div>
      </div>
    </div>
  );
};

export default FileTooltipRender;
