import {
  saveBirthPlan,
  subscribeToBirthPlan,
  exportBirthPlanText,
  DEFAULT_SECTIONS,
  BIRTH_PLAN_SECTIONS,
  BirthPlanSection,
} from '../../services/firebase/birthPlanService';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// All Firebase methods are auto-mocked via jest.setup.js
const mockDoc = doc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockTimestamp = Timestamp as unknown as { now: jest.Mock };

const mockDocRef = 'mock-doc-ref';
const mockUnsubscribe = jest.fn();

const SAMPLE_SECTIONS: BirthPlanSection[] = [
  { title: 'Pain Management', selectedOptions: ['Epidural', 'IV pain medication'], notes: 'Prefer epidural early.' },
  { title: 'Labor Preferences', selectedOptions: [], notes: '' },
  { title: 'Delivery Preferences', selectedOptions: ['Delayed cord clamping'], notes: '' },
  { title: 'After Delivery', selectedOptions: [], notes: 'Need quiet time.' },
  { title: 'Special Requests', selectedOptions: ['No students or trainees present'], notes: '' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue(mockDocRef);
  mockSetDoc.mockResolvedValue(undefined);
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
  mockTimestamp.now.mockReturnValue({ seconds: 9999, nanoseconds: 0 });
});

// ---------------------------------------------------------------------------
// saveBirthPlan
// ---------------------------------------------------------------------------
describe('saveBirthPlan', () => {
  it('calls setDoc with the correct Firestore path', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    await saveBirthPlan('user-1', 'preg-1', SAMPLE_SECTIONS);

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'birthPlan',
      'main'
    );
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('calls setDoc with sections and pregnancyId', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    await saveBirthPlan('user-1', 'preg-1', SAMPLE_SECTIONS);

    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      pregnancyId: 'preg-1',
      sections: SAMPLE_SECTIONS,
    });
    expect(callArgs).toHaveProperty('updatedAt');
    expect(callArgs).toHaveProperty('createdAt');
  });

  it('uses existing createdAt when document already exists', async () => {
    const existingCreatedAt = { seconds: 1000, nanoseconds: 0 };
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdAt: existingCreatedAt }),
    });

    await saveBirthPlan('user-1', 'preg-1', SAMPLE_SECTIONS);

    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs.createdAt).toBe(existingCreatedAt);
  });

  it('sets a new createdAt when document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    await saveBirthPlan('user-1', 'preg-1', SAMPLE_SECTIONS);

    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(mockTimestamp.now).toHaveBeenCalled();
    expect(callArgs.createdAt).toEqual({ seconds: 9999, nanoseconds: 0 });
  });
});

// ---------------------------------------------------------------------------
// subscribeToBirthPlan
// ---------------------------------------------------------------------------
describe('subscribeToBirthPlan', () => {
  it('calls onSnapshot with the correct doc ref', () => {
    const callback = jest.fn();

    subscribeToBirthPlan('user-1', 'preg-1', callback);

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'birthPlan',
      'main'
    );
    expect(mockOnSnapshot).toHaveBeenCalledWith(mockDocRef, expect.any(Function));
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToBirthPlan('user-1', 'preg-1', callback);

    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('calls callback with null when document does not exist', () => {
    const callback = jest.fn();

    mockOnSnapshot.mockImplementationOnce((_ref: unknown, cb: Function) => {
      cb({ exists: () => false, id: 'main', data: () => undefined });
      return mockUnsubscribe;
    });

    subscribeToBirthPlan('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it('calls callback with plan data when document exists', () => {
    const callback = jest.fn();
    const planData = {
      pregnancyId: 'preg-1',
      sections: SAMPLE_SECTIONS,
      updatedAt: { seconds: 5000, nanoseconds: 0 },
      createdAt: { seconds: 1000, nanoseconds: 0 },
    };

    mockOnSnapshot.mockImplementationOnce((_ref: unknown, cb: Function) => {
      cb({ exists: () => true, id: 'main', data: () => planData });
      return mockUnsubscribe;
    });

    subscribeToBirthPlan('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith({ id: 'main', ...planData });
  });
});

// ---------------------------------------------------------------------------
// exportBirthPlanText  (pure — no Firebase)
// ---------------------------------------------------------------------------
describe('exportBirthPlanText', () => {
  it('includes the mother name in the output', () => {
    const result = exportBirthPlanText('Jane Doe', DEFAULT_SECTIONS);
    expect(result).toContain('JANE DOE');
  });

  it('includes each section title', () => {
    const result = exportBirthPlanText('Jane', SAMPLE_SECTIONS);
    expect(result).toContain('## Pain Management');
    expect(result).toContain('## Labor Preferences');
    expect(result).toContain('## Delivery Preferences');
    expect(result).toContain('## After Delivery');
    expect(result).toContain('## Special Requests');
  });

  it('lists selected options with bullet points', () => {
    const result = exportBirthPlanText('Jane', SAMPLE_SECTIONS);
    expect(result).toContain('  • Epidural');
    expect(result).toContain('  • IV pain medication');
    expect(result).toContain('  • Delayed cord clamping');
  });

  it('shows "(no preferences selected)" when options array is empty', () => {
    const result = exportBirthPlanText('Jane', SAMPLE_SECTIONS);
    // Labor Preferences has no selectedOptions in SAMPLE_SECTIONS
    expect(result).toContain('  (no preferences selected)');
  });

  it('includes notes when notes are present', () => {
    const result = exportBirthPlanText('Jane', SAMPLE_SECTIONS);
    expect(result).toContain('  Notes: Prefer epidural early.');
    expect(result).toContain('  Notes: Need quiet time.');
  });

  it('omits notes line when notes are empty', () => {
    const simpleSections: BirthPlanSection[] = [
      { title: 'Pain Management', selectedOptions: ['Epidural'], notes: '' },
    ];
    const result = exportBirthPlanText('Jane', simpleSections);
    expect(result).not.toContain('Notes:');
  });

  it('includes a generated date line', () => {
    const result = exportBirthPlanText('Jane', DEFAULT_SECTIONS);
    expect(result).toContain('Generated:');
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_SECTIONS (pure)
// ---------------------------------------------------------------------------
describe('DEFAULT_SECTIONS', () => {
  it('has exactly 5 sections', () => {
    expect(DEFAULT_SECTIONS).toHaveLength(5);
  });

  it('each section starts with empty selectedOptions', () => {
    DEFAULT_SECTIONS.forEach(section => {
      expect(section.selectedOptions).toEqual([]);
    });
  });

  it('each section starts with empty notes', () => {
    DEFAULT_SECTIONS.forEach(section => {
      expect(section.notes).toBe('');
    });
  });

  it('section titles match BIRTH_PLAN_SECTIONS titles', () => {
    DEFAULT_SECTIONS.forEach((section, idx) => {
      expect(section.title).toBe(BIRTH_PLAN_SECTIONS[idx].title);
    });
  });
});

// ---------------------------------------------------------------------------
// BIRTH_PLAN_SECTIONS (pure)
// ---------------------------------------------------------------------------
describe('BIRTH_PLAN_SECTIONS', () => {
  it('has exactly 5 sections', () => {
    expect(BIRTH_PLAN_SECTIONS).toHaveLength(5);
  });

  it('has the correct section titles in order', () => {
    const expectedTitles = [
      'Pain Management',
      'Labor Preferences',
      'Delivery Preferences',
      'After Delivery',
      'Special Requests',
    ];
    BIRTH_PLAN_SECTIONS.forEach((section, idx) => {
      expect(section.title).toBe(expectedTitles[idx]);
    });
  });

  it('each section has at least one option', () => {
    BIRTH_PLAN_SECTIONS.forEach(section => {
      expect(section.options.length).toBeGreaterThan(0);
    });
  });
});
