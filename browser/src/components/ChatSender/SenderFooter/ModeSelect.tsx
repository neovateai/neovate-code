import Icon, { CheckOutlined } from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import { MODES } from '@/constants/chat';
import { actions, state } from '@/state/sender';
import SenderComponent from '../SenderComponent';

const ModeSelect = () => {
  const { mode } = useSnapshot(state);

  return (
    <SenderComponent.Select
      value={mode}
      onChange={(value) => {
        actions.updateMode(value as string);
      }}
      popupMatchSelectWidth={false}
      options={MODES.map((mode) => {
        return {
          label: (
            <div className="flex items-center gap-1">
              <Icon component={() => mode.icon} className="text-sm" />
              {mode.label}
            </div>
          ),
          value: mode.key,
          modeItem: mode,
        };
      })}
      optionRender={(option) => {
        const { data, value } = option;
        const { modeItem } = data;
        return (
          <div className="flex justify-start items-center gap-2 p-1">
            <Icon component={() => modeItem.icon} className="text-lg" />
            <div className="flex justify-between w-80">
              <div className="flex flex-col items-start gap-0.5">
                <div className="text-sm text-[#110C22] font-normal">
                  {modeItem.label}
                </div>
                <div className="text-xs text-[#666F8D] font-normal truncate">
                  {modeItem.description}
                </div>
              </div>
              {mode === value && (
                <CheckOutlined className="text-[#7357FF]! text-base" />
              )}
            </div>
          </div>
        );
      }}
    />
  );
};

export default ModeSelect;
