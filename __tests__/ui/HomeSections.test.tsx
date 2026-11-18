import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../context/ThemeContext';
import { ComingUp, ForYouThisWeek, RecentlyLogged } from '../../components/home/PregnancyHomeSections';

const ts = (d: Date) => ({ toDate: () => d }) as never;
const inDays = (n: number) => new Date(Date.now() + n * 86400000);
const WEEK_INFO = {
  week: 24,
  babySize: 'corn',
  babyLength: '30 cm',
  babyWeight: '600 g',
  babyDevelopment: ['Lungs are developing'],
  motherChanges: ['You may notice Braxton Hicks', 'Your bump is growing fast', 'Third note'],
  tips: ['Drink plenty of water'],
  pregnancyInfo: { appointments: ['Glucose screening'], tests: [], milestones: [] },
} as never;

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Coming up', () => {
  it('shows the next appointment and what is usually scheduled this week', async () => {
    const onOpen = jest.fn();
    const visits = [{ id: 'v', date: ts(inDays(-10)), week: 22, type: 'checkup', nextVisitDate: ts(inDays(6)) }] as never;
    await wrap(<ComingUp visits={visits} weekInfo={WEEK_INFO} onOpenVisits={onOpen} onAddVisit={jest.fn()} />);
    expect(screen.getByText('Next appointment')).toBeOnTheScreen();
    expect(screen.getByText(/In 6 days/)).toBeOnTheScreen();
    expect(screen.getByText('Glucose screening')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Next appointment'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('invites adding one when nothing is saved', async () => {
    const onAdd = jest.fn();
    await wrap(<ComingUp visits={[]} weekInfo={null} onOpenVisits={jest.fn()} onAddVisit={onAdd} />);
    await fireEvent.press(screen.getByLabelText('Add your next appointment'));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('For you this week', () => {
  it('shows two body notes and a tip for today', async () => {
    await wrap(<ForYouThisWeek weekInfo={WEEK_INFO} loading={false} onMore={jest.fn()} />);
    expect(screen.getByText('You may notice Braxton Hicks')).toBeOnTheScreen();
    expect(screen.getByText('Your bump is growing fast')).toBeOnTheScreen();
    expect(screen.queryByText('Third note')).toBeNull();
    expect(screen.getByText('Tip for today')).toBeOnTheScreen();
    expect(screen.getByText('Drink plenty of water')).toBeOnTheScreen();
  });

  it('hides itself when the week has nothing for you', async () => {
    const empty = { ...(WEEK_INFO as object), motherChanges: [], tips: [] } as never;
    await wrap(<ForYouThisWeek weekInfo={empty} loading={false} onMore={jest.fn()} />);
    expect(screen.queryByText('For you this week')).toBeNull();
  });
});

describe('Recently logged', () => {
  it('lists the latest entries and opens them', async () => {
    const onOpen = jest.fn();
    const onSeeAll = jest.fn();
    await wrap(
      <RecentlyLogged
        visits={[{ id: 'v', date: ts(inDays(-3)), week: 24, type: 'checkup', label: 'Checkup' }] as never}
        symptoms={[{ id: 's', date: ts(inDays(0)), week: 24, type: 'other', label: 'Heartburn', severity: 2 }] as never}
        milestones={[]}
        onSeeAll={onSeeAll}
        onOpen={onOpen}
      />
    );
    expect(screen.getByText('Heartburn')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('3 days ago')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Heartburn'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ kind: 'symptom' }));
    await fireEvent.press(screen.getByText('See all'));
    expect(onSeeAll).toHaveBeenCalled();
  });

  it('shows a friendly empty state for a new journal', async () => {
    await wrap(<RecentlyLogged visits={[]} symptoms={[]} milestones={[]} onSeeAll={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText('Nothing logged yet')).toBeOnTheScreen();
    expect(screen.queryByText('See all')).toBeNull();
  });
});
