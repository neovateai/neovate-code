import { useTranslation } from 'react-i18next';

interface IProps {
  selectedFirstKey?: string;
}

const ListFooter = ({ selectedFirstKey }: IProps) => {
  const { t } = useTranslation();

  return (
    <div className="px-3.5 pt-1.5 border-t border-[#eeeff0] text-xs text-gray-500 select-none">
      <div className="flex items-center gap-3 justify-end">
        <div className="flex items-center gap-1">
          <div>↑↓</div>
          <div>{t('suggestion.navigate')}</div>
        </div>
        <div className="flex items-center gap-1">
          <div>Enter</div>
          <div>{t('suggestion.select')}</div>
        </div>
        <div className="flex items-center gap-1">
          <div>Esc</div>
          <div>
            {selectedFirstKey ? t('suggestion.back') : t('suggestion.close')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListFooter;
