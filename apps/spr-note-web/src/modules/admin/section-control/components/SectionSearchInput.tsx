import React from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import { useSectionTranslation } from '../hooks/useSectionTranslation';

export interface SectionSearchInputProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SectionSearchInput: React.FC<SectionSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => {
  const { t } = useSectionTranslation();

  return (
    <div className={`w-full sm:w-80 shrink-0 ${className}`}>
      <CustomInput
        type="search"
        size="sm"
        value={value}
        onChange={(val: any) => onChange(typeof val === 'string' ? val : val?.target?.value || '')}
        placeholder={placeholder || t('search.placeholder', 'Filter features and modules by title or key...')}
        clearable={true}
      />
    </div>
  );
};

export default SectionSearchInput;
