import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useStoredSession } from '../../hooks/useStoredSession';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});

describe('useFormDraft (PRD 8.4)', () => {
  it('hands a saved draft back on the next launch', async () => {
    await AsyncStorage.setItem('draft:k', JSON.stringify({ notes: 'half typed' }));
    const onRestore = jest.fn();
    await renderHook(() => useFormDraft('draft:k', false, { notes: '' }, onRestore));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith({ notes: 'half typed' }));
  });

  it('saves while the form is open and discards the draft when it closes', async () => {
    type Props = { open: boolean; notes: string };
    const { rerender } = await renderHook(({ open, notes }: Props) => useFormDraft('draft:k', open, { notes }, jest.fn()), {
      initialProps: { open: true, notes: 'a' },
    });
    await rerender({ open: true, notes: 'abc' });
    await waitFor(async () => expect(await AsyncStorage.getItem('draft:k')).toBe(JSON.stringify({ notes: 'abc' })));
    await rerender({ open: false, notes: 'abc' });
    await waitFor(async () => expect(await AsyncStorage.getItem('draft:k')).toBeNull());
  });
});

describe('useStoredSession', () => {
  it('restores, saves and clears a live session', async () => {
    await AsyncStorage.setItem('live:k', JSON.stringify({ startedAt: 5, kicks: [6] }));
    const { result } = await renderHook(() => useStoredSession<{ startedAt: number; kicks: number[] }>('live:k'));
    await waitFor(() => expect(result.current[3]).toBe(true));
    expect(result.current[0]).toEqual({ startedAt: 5, kicks: [6] });

    await act(async () => result.current[1]({ startedAt: 5, kicks: [6, 7] }));
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('live:k'))!)).toEqual({ startedAt: 5, kicks: [6, 7] }));

    await act(async () => result.current[2]());
    await waitFor(async () => expect(await AsyncStorage.getItem('live:k')).toBeNull());
    expect(result.current[0]).toBeNull();
  });
});
