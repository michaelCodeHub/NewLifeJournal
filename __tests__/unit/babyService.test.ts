import { collection, doc, onSnapshot, orderBy, limit, setDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import {
  ACTIVITY_WINDOW,
  addActivity,
  createBaby,
  deleteBaby,
  endActivity,
  subscribeToActivities,
  updateActivity,
} from '../../services/firebase/babyService';
import { trackEvent } from '../../services/monitoring/analytics';

jest.mock('../../services/monitoring/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../services/monitoring/errorLogger', () => ({ logError: jest.fn() }));

const mockDoc = doc as jest.Mock;
const mockCollection = collection as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockImplementation((_db: unknown, ...path: string[]) => ({ path: path.join('/') }));
  // doc(collectionRef) → new doc with a generated id; doc(ref, id) / doc(db, ...path) → that doc.
  mockDoc.mockImplementation((first: any, ...rest: string[]) =>
    rest.length === 0
      ? { id: 'gen-id', path: `${first.path}/gen-id` }
      : { id: rest[rest.length - 1], path: [first?.path, ...rest].filter(Boolean).join('/') }
  );
  (setDoc as jest.Mock).mockResolvedValue(undefined);
  (updateDoc as jest.Mock).mockResolvedValue(undefined);
  (deleteDoc as jest.Mock).mockResolvedValue(undefined);
});

describe('createBaby', () => {
  it('writes one doc under users/{uid}/babies with its id, status and timestamps, dropping empty fields', async () => {
    const id = await createBaby('u1', { name: 'Aria', birthDate: 'TS' as any, birthWeight: undefined, fromPregnancyId: 'p1' });
    expect(id).toBe('gen-id');
    const [ref, data] = (setDoc as jest.Mock).mock.calls[0];
    expect(ref.path).toBe('users/u1/babies/gen-id');
    expect(data).toMatchObject({ id: 'gen-id', name: 'Aria', status: 'active', fromPregnancyId: 'p1' });
    expect('birthWeight' in data).toBe(false);
    expect(trackEvent).toHaveBeenCalledWith('baby_created');
  });
});

describe('activities', () => {
  it('adds an activity with a generated id and tracks the right event', async () => {
    await addActivity('u1', 'b1', { type: 'diaper', startedAt: 'TS' as any, diaper: { kind: 'wet' } });
    const [ref, data] = (setDoc as jest.Mock).mock.calls[0];
    expect(ref.path).toBe('users/u1/babies/b1/activities/gen-id');
    expect(data).toMatchObject({ id: 'gen-id', type: 'diaper', diaper: { kind: 'wet' } });
    expect(trackEvent).toHaveBeenCalledWith('diaper_logged');
  });

  it('clears fields passed as undefined on update (e.g. a timer that is running again)', async () => {
    await updateActivity('u1', 'b1', 'a1', { endedAt: undefined, notes: 'ok' });
    const [, data] = (updateDoc as jest.Mock).mock.calls[0];
    expect(data).toEqual({ endedAt: '__deleteField__', notes: 'ok' });
  });

  it('stops a running timer by setting endedAt', async () => {
    await endActivity('u1', 'b1', 'a1', new Date(1000));
    const [ref, data] = (updateDoc as jest.Mock).mock.calls[0];
    expect(ref.path).toBe('users/u1/babies/b1/activities/a1');
    expect(data.endedAt.toDate().getTime()).toBe(1000);
  });

  it('listens to the newest activities first, within the window', () => {
    subscribeToActivities('u1', 'b1', jest.fn());
    expect(orderBy).toHaveBeenCalledWith('startedAt', 'desc');
    expect(limit).toHaveBeenCalledWith(ACTIVITY_WINDOW);
    expect(onSnapshot).toHaveBeenCalled();
  });
});

describe('deleteBaby', () => {
  it('deletes every sub-collection, then the baby', async () => {
    const del = jest.fn();
    const commit = jest.fn().mockResolvedValue(undefined);
    (writeBatch as jest.Mock).mockReturnValue({ delete: del, commit });
    (getDocs as jest.Mock).mockResolvedValue({ docs: [{ ref: 'r1' }, { ref: 'r2' }] });
    await deleteBaby('u1', 'b1');
    const subPaths = (getDocs as jest.Mock).mock.calls.map((c) => c[0].path);
    expect(subPaths).toEqual([
      'users/u1/babies/b1/activities',
      'users/u1/babies/b1/growth',
      'users/u1/babies/b1/health',
      'users/u1/babies/b1/chatMessages',
    ]);
    expect(del).toHaveBeenCalledTimes(8);
    expect((deleteDoc as jest.Mock).mock.calls[0][0].path).toBe('users/u1/babies/b1');
  });
});
