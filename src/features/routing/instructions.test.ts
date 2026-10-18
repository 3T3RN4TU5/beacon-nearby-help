import { describeStep } from './instructions';

describe('describeStep', () => {
  it.each([
    [{ type: 'depart', bearing_after: 92 }, 'Janpath', 'Head east on Janpath'],
    [{ type: 'turn', modifier: 'left' }, 'MG Road', 'Turn left onto MG Road'],
    [{ type: 'turn', modifier: 'sharp right' }, '', 'Turn sharp right'],
    [{ type: 'turn', modifier: 'uturn' }, '', 'Make a U-turn'],
    [{ type: 'new name' }, 'Ring Road', 'Continue onto Ring Road'],
    [{ type: 'continue', modifier: 'slight left' }, 'NH48', 'Keep slight left on NH48'],
    [{ type: 'fork', modifier: 'slight right' }, 'NH44', 'Keep right at the fork onto NH44'],
    [{ type: 'off ramp', modifier: 'slight left' }, 'Exit 4', 'Take the exit on the left onto Exit 4'],
    [{ type: 'end of road', modifier: 'right' }, 'Park St', 'Turn right at the end of the road onto Park St'],
    [{ type: 'roundabout', exit: 2 }, 'Rajpath', 'At the roundabout, take the 2nd exit onto Rajpath'],
    [{ type: 'rotary', exit: 3 }, '', 'At the roundabout, take the 3rd exit'],
    [{ type: 'arrive', modifier: 'right' }, '', 'Arrive — destination is on your right'],
    [{ type: 'arrive' }, '', 'Arrive at destination'],
    [{ type: 'something new' }, 'X', 'Continue on X'],
  ])('%j on "%s" → %s', (maneuver, road, expected) => {
    expect(describeStep(maneuver, road)).toBe(expected);
  });

  it('names rotaries', () => {
    expect(describeStep({ type: 'rotary', exit: 1 }, 'Akbar Rd', 'India Gate Circle')).toBe(
      'At the roundabout (India Gate Circle), take the 1st exit onto Akbar Rd',
    );
  });
});
