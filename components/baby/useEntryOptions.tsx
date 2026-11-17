import { useCallback, useState } from 'react';
import { useBaby } from '../../context/BabyContext';
import { Card, ConfirmSheet, ListRow, Sheet, useToast } from '../ui';
import type { BabyEntry } from './entries';
import type { LogTarget } from './useLogSheets';

/** "…" on a baby entry: Edit or Delete (with confirm). */
export function useEntryOptions(openLog: (t: LogTarget) => void) {
  const { deleteActivity, deleteGrowth, deleteHealth } = useBaby();
  const toast = useToast();
  const [selected, setSelected] = useState<BabyEntry | null>(null);
  const [confirm, setConfirm] = useState(false);

  const show = useCallback((e: BabyEntry) => setSelected(e), []);

  const remove = async () => {
    const e = selected;
    if (!e) return;
    try {
      if (e.kind === 'growth') await deleteGrowth(e.id);
      else if (e.kind === 'health') await deleteHealth(e.id);
      else await deleteActivity(e.id);
      toast.show('Entry deleted');
    } catch {
      toast.show("Couldn't delete that. Try again.", 'error');
    }
  };

  const element = (
    <>
      <Sheet visible={!!selected && !confirm} onClose={() => setSelected(null)} title={selected?.title} subtitle={selected?.detail || undefined}>
        <Card padded={false}>
          <ListRow
            icon="create-outline"
            title="Edit entry"
            onPress={() => {
              const e = selected;
              setSelected(null);
              // Let this sheet finish closing before the form sheet opens.
              if (e) setTimeout(() => openLog(e.target), 300);
            }}
          />
          <ListRow icon="trash-outline" title="Delete entry" destructive last chevron={false} onPress={() => setConfirm(true)} />
        </Card>
      </Sheet>
      <ConfirmSheet
        visible={confirm}
        onClose={() => {
          setConfirm(false);
          setSelected(null);
        }}
        title="Delete this entry?"
        body={selected ? `"${selected.title}" will be removed.` : undefined}
        onConfirm={remove}
      />
    </>
  );

  return { show, element };
}
