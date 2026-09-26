import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Score } from './Score';

describe('accessible safety score', () => {
  it('shows the safe-to-unsafe scale, label and report count', () => {
    render(<Score score={8.25} count={3} />);
    expect(screen.getByText('8.3')).toBeInTheDocument();
    expect(screen.getByText('Very high reported concern')).toBeInTheDocument();
    expect(screen.getByText('3 community ratings')).toBeInTheDocument();
  });

  it('explains the empty state without using colour as the only cue', () => {
    render(<Score score={null} count={0} />);
    expect(screen.getByText('No community ratings')).toBeInTheDocument();
    expect(screen.getByText('0 community ratings')).toBeInTheDocument();
  });
});
