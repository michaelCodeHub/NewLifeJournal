import { getBabySuggestions, getQuickSuggestions } from '../../components/chat/ChatEmptyState';

describe('getQuickSuggestions (PRD F26)', () => {
  it('leads with this week and the latest symptom', () => {
    expect(getQuickSuggestions(20, 'Heartburn')).toEqual([
      "What's my baby doing at week 20?",
      'Is heartburn normal at week 20?',
      'What foods should I avoid?',
      'What should I know about the anatomy scan?',
    ]);
  });

  it('fills with stage questions when no symptom is logged', () => {
    const q = getQuickSuggestions(36);
    expect(q).toHaveLength(4);
    expect(q[0]).toBe("What's my baby doing at week 36?");
    expect(q).toContain('What should I pack in my hospital bag?');
    expect(q).toContain('What foods should I avoid?');
  });

  it('gives age-appropriate baby questions', () => {
    expect(getBabySuggestions(3)[0]).toBe('How often should a newborn feed?');
    expect(getBabySuggestions(200)[0]).toBe('How do I start solid foods?');
  });
});
