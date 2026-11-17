import React, { useState } from 'react';
import { OptionSheet } from './Choice';
import { SelectField } from './Fields';
import { selectedLabel, type SelectMenuProps } from './SelectMenu.types';

/**
 * SelectMenu as a field + OptionSheet — the web version on every list, and the
 * iOS/Android fallback for long or rich lists. Identical to the existing
 * SelectField + OptionSheet pattern (e.g. Visits → Type).
 */
export function SelectMenuSheet<T extends string>({ label, optional, title, options, value, placeholder, onSelect }: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectField label={label} optional={optional} value={selectedLabel(options, value)} placeholder={placeholder} onPress={() => setOpen(true)} />
      <OptionSheet<T> visible={open} onClose={() => setOpen(false)} title={title} options={options} value={value} onSelect={onSelect} />
    </>
  );
}
