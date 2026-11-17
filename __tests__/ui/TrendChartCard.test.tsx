import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrendChartCard } from '../../components/insights/TrendChartCard';
import { ThemeProvider } from '../../context/ThemeContext';

// RNTL 14: render and fireEvent are async.
// Smoke test for the react-native-chart-kit integration (components/insights/):
// the themed config from chartTheme.ts must be accepted and the SVG line drawn.

const baseProps = {
  title: 'Weight',
  icon: 'scale' as const,
  tone: 'teal' as const,
  emptyTitle: 'No readings yet',
  emptyBody: 'Log two readings to see a trend.',
};

async function renderCard(props: Partial<React.ComponentProps<typeof TrendChartCard>> = {}) {
  return render(
    <ThemeProvider>
      <TrendChartCard
        {...baseProps}
        value="68.4"
        unit="kg"
        labels={['W20', 'W22', 'W24']}
        series={[{ label: 'Weight', data: [66.1, 67.2, 68.4], color: 'primaryDark' }]}
        {...props}
      />
    </ThemeProvider>
  );
}

// The chart's measuring wrapper: the only host view with an onLayout handler.
function chartWrap() {
  const matches = screen.container.queryAll((n) => typeof n.props.onLayout === 'function');
  expect(matches).toHaveLength(1);
  return matches[0];
}

describe('TrendChartCard (react-native-chart-kit)', () => {
  it('draws the line chart once the card has a width', async () => {
    const { toJSON } = await renderCard();
    expect(screen.getByText('68.4')).toBeOnTheScreen();

    // The chart waits for onLayout before rendering at the measured width.
    expect(JSON.stringify(toJSON())).not.toContain('RNSVGPath');
    await fireEvent(chartWrap(), 'layout', {
      nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
    });
    expect(JSON.stringify(toJSON())).toContain('RNSVGPath');
  });

  it('renders a legend for multi-line charts', async () => {
    await renderCard({
      series: [
        { label: 'Systolic', data: [110, 115, 112], color: 'red' },
        { label: 'Diastolic', data: [70, 74, 72], color: 'blue' },
      ],
    });
    await fireEvent(chartWrap(), 'layout', {
      nativeEvent: { layout: { width: 320, height: 200, x: 0, y: 0 } },
    });
    expect(screen.getByText('Systolic')).toBeOnTheScreen();
    expect(screen.getByText('Diastolic')).toBeOnTheScreen();
  });

  it('shows the empty state with no data', async () => {
    await renderCard({ value: undefined, series: [{ label: 'Weight', data: [], color: 'primaryDark' }] });
    expect(screen.getByText('No readings yet')).toBeOnTheScreen();
  });
});
