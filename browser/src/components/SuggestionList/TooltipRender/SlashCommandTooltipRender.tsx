interface Props {
  description: React.ReactNode;
}

const SlashCommandTooltipRender = (props: Props) => {
  const { description } = props;
  return (
    <div className="flex items-baseline gap-1 select-none max-w-110">
      <div className="overflow-hidden">{description}</div>
    </div>
  );
};

export default SlashCommandTooltipRender;
