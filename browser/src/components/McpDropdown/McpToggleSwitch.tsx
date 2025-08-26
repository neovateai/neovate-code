import React from 'react';
import styles from './McpToggleSwitch.module.css';

interface McpToggleSwitchProps {
  enabled: boolean;
  disabled?: boolean;
  showOffText?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const McpToggleSwitch: React.FC<McpToggleSwitchProps> = ({
  enabled,
  disabled = false,
  showOffText = false,
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  };

  // Determine switch style class based on state
  const getSwitchClass = () => {
    if (enabled) {
      return styles.switchEnabled;
    }
    if (disabled && showOffText) {
      return styles.switchDisabledWithText;
    }
    return styles.switchDisabled;
  };

  // Determine knob style class based on state
  const getKnobClass = () => {
    if (enabled) {
      return styles.knobEnabled;
    }
    if (disabled && showOffText) {
      return styles.knobDisabledWithText;
    }
    return styles.knobDisabled;
  };

  return (
    <div className={getSwitchClass()} onClick={handleClick}>
      {/* Show "Off" text (only in specific state) */}
      {disabled && showOffText && <span className={styles.offText}>关</span>}

      {/* Switch knob */}
      <div className={getKnobClass()} />
    </div>
  );
};

export default McpToggleSwitch;
