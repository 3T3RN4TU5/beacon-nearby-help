import { emergencyLines, primaryLine } from './numbers';
import { buildLocationMessage, googleMapsSearchLink, navigationLinks, smsHref, telHref } from './share';

describe('emergency numbers', () => {
  it('returns country-specific lines', () => {
    const { lines, known } = emergencyLines('in');
    expect(known).toBe(true);
    expect(lines.map((l) => l.number)).toEqual(expect.arrayContaining(['112', '100', '101', '108']));
    expect(primaryLine('IN').number).toBe('112');
    expect(primaryLine('US').number).toBe('911');
    expect(primaryLine('JP').number).toBe('110'); // no general line: falls back to the first entry
  });

  it('falls back to 112 for EU members and unknown countries', () => {
    expect(emergencyLines('NL')).toMatchObject({ known: true, lines: [{ number: '112' }] });
    expect(emergencyLines('ZZ')).toMatchObject({ known: false, lines: [{ number: '112' }] });
    expect(emergencyLines(undefined).known).toBe(false);
  });
});

describe('share helpers', () => {
  it('builds safe tel/sms links', () => {
    expect(telHref('+91 11-2336 5525')).toBe('tel:+911123365525');
    expect(smsHref('Help me & now', '98100 00000')).toBe('sms:9810000000?&body=Help%20me%20%26%20now');
  });

  it('builds a location message with a maps link and nearest hospital', () => {
    const msg = buildLocationMessage({
      origin: { lat: 28.6139, lon: 77.209 },
      accuracy: 12,
      placeLabel: 'Janpath, New Delhi',
      nearestHospital: { name: 'RML Hospital', distance: 1800 },
    });
    expect(msg).toContain('I need help.');
    expect(msg).toContain('Janpath, New Delhi');
    expect(msg).toContain('https://maps.google.com/?q=28.613900,77.209000');
    expect(msg).toContain('Nearest hospital: RML Hospital, 1.8 km away');
  });

  it('builds a Google Maps search around a point as a fallback', () => {
    expect(googleMapsSearchLink('police station', { lat: 28.6315, lon: 77.2167 })).toBe(
      'https://www.google.com/maps/search/police%20station/@28.63150,77.21670,15z',
    );
  });

  it('hands off to navigation apps with the right travel mode', () => {
    const links = navigationLinks({ lat: 1, lon: 2 }, { lat: 3, lon: 4 }, 'cycling');
    expect(links.google).toContain('travelmode=bicycling');
    expect(links.osm).toContain('engine=fossgis_osrm_bike');
  });
});
