import { motion } from 'motion/react';
import {
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  Haze,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  Wind,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { useRoadWeather } from '@/data/useRoadWeather';
import type { RideConditions, WeatherAlert } from '@/features/weather/alerts';
import { localTimeAt, type Forecast, type HourlyPoint } from '@/features/weather/openMeteo';
import {
  describeWeatherCode,
  isFogCode,
  isThunderstorm,
  type WeatherGlyph,
} from '@/features/weather/weatherCodes';
import { cn } from '@/lib/cn';
import { formatSpeed, formatTemperature, formatVisibility, formatWallClock, type Units } from '@/lib/format';
import { compass16 } from '@/lib/geo';
import { useApp } from '@/store/app';
import { Button } from '../ui/Button';
import { Badge, SectionLabel, Skeleton } from '../ui/primitives';
import { ALERT_ICONS, SEVERITY_STYLE } from './alertStyle';
import { useUnits } from '@/hooks/useUnits';

const GLYPHS: Record<WeatherGlyph, [day: LucideIcon, night: LucideIcon]> = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  fog: [CloudFog, CloudFog],
  drizzle: [CloudDrizzle, CloudDrizzle],
  rain: [CloudRain, CloudRain],
  freezing: [CloudSnow, CloudSnow],
  snow: [CloudSnow, CloudSnow],
  storm: [CloudLightning, CloudLightning],
};

function WeatherIcon({ code, isDay, ...props }: { code: number; isDay: boolean } & LucideProps) {
  const Icon = GLYPHS[describeWeatherCode(code).glyph][isDay ? 0 : 1];
  return <Icon {...props} />;
}

export function WeatherView() {
  const anchor = useApp((s) => s.anchor);
  const units = useUnits();
  const { forecast, air, alerts, ride } = useRoadWeather(anchor);

  if (forecast.isPending) {
    return (
      <div className="flex flex-col gap-3 px-5 py-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (forecast.isError || !forecast.data) {
    return (
      <div className="flex flex-col items-start gap-3 px-5 py-6">
        <p className="text-sm text-muted">Weather is unavailable right now.</p>
        <Button size="sm" onClick={() => forecast.refetch()}>
          <RefreshCw size={14} /> Retry
        </Button>
      </div>
    );
  }

  const f = forecast.data;
  const c = f.current;
  const today = f.daily[0];

  return (
    <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="hud text-subtle">Now · {describeWeatherCode(c.code).label}</p>
          <p className="mt-1 font-mono text-[56px] leading-none font-semibold tracking-tighter tabular-nums">
            {formatTemperature(c.temperature, units).replace(/[CF]$/, '')}
          </p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span>Feels like {formatTemperature(c.feelsLike, units)}</span>
            {today && (
              <span className="font-mono text-xs leading-5">
                H {formatTemperature(today.max, units)} · L {formatTemperature(today.min, units)}
              </span>
            )}
          </p>
        </div>
        <motion.div
          initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
        >
          <WeatherIcon
            code={c.code}
            isDay={c.isDay}
            size={72}
            strokeWidth={1.25}
            className="text-accent-ink"
          />
        </motion.div>
      </section>

      <RideGauge
        ride={ride}
        riderAlerts={
          alerts.filter((a) => a.audience.includes('riders') || a.audience.includes('everyone')).length
        }
      />

      <section className="flex flex-col gap-2">
        <SectionLabel right={<span className="hud text-subtle">next 6 h</span>}>Road alerts</SectionLabel>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ok/25 bg-ok/8 px-4 py-3.5">
            <ShieldCheck size={20} className="shrink-0 text-ok" />
            <p className="text-sm">
              <span className="font-semibold">No road-weather hazards.</span>{' '}
              <span className="text-muted">Conditions look fine for the next six hours.</span>
            </p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="flex flex-col gap-2"
          >
            {alerts.map((a) => (
              <AlertCard key={a.kind} alert={a} forecast={f} />
            ))}
          </motion.ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Next 12 hours</SectionLabel>
        <HourlyStrip hours={f.hourly.slice(0, 12)} offset={f.utcOffsetSeconds} units={units} />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Metric icon={Wind} label="Wind">
          <span className="flex items-center gap-1.5">
            <ArrowUp
              size={16}
              className="text-accent-ink"
              style={{ transform: `rotate(${(c.windDirection + 180) % 360}deg)` }}
            />
            {formatSpeed(c.windSpeed, units)}
          </span>
          <Sub>
            Gusts {formatSpeed(c.windGusts, units)} · from {compass16(c.windDirection)}
          </Sub>
        </Metric>
        <Metric icon={Eye} label="Visibility">
          {formatVisibility(c.visibility, units)}
          <Sub>
            {c.visibility < 1000 ? 'Poor — use low beams' : c.visibility < 5000 ? 'Reduced' : 'Clear'}
          </Sub>
        </Metric>
        <Metric icon={Haze} label="Air quality">
          {air.data?.usAqi != null ? (
            <>
              <span>
                {Math.round(air.data.usAqi)} <span className="text-xs text-muted">US AQI</span>
              </span>
              <Sub className={aqiInfo(air.data.usAqi).tone}>{aqiInfo(air.data.usAqi).label}</Sub>
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </Metric>
        <Metric icon={Sun} label="UV index">
          {c.isDay ? Math.round(c.uvIndex) : 0}
          <Sub>{uvLabel(c.isDay ? c.uvIndex : 0)}</Sub>
        </Metric>
        <Metric icon={Droplets} label="Humidity">
          {Math.round(c.humidity)}%<Sub>Precip {c.precipitation.toFixed(1)} mm</Sub>
        </Metric>
        <Metric icon={c.isDay ? Sunset : Sunrise} label={c.isDay ? 'Sunset' : 'Sunrise'}>
          {today
            ? formatWallClock(
                localTimeAt(
                  c.isDay
                    ? today.sunset
                    : (f.daily.find((d) => d.sunrise > c.time)?.sunrise ?? today.sunrise),
                  f.utcOffsetSeconds,
                ),
              )
            : '—'}
          <Sub>Local time · {f.timezone.split('/').pop()?.replace(/_/g, ' ')}</Sub>
        </Metric>
      </section>

      <p className="text-[11px] leading-relaxed text-subtle">
        Forecast by{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Open-Meteo
        </a>{' '}
        (CC BY 4.0). Alerts are Beacon&apos;s own threshold rules — follow official warnings from your
        national weather service.
      </p>
    </div>
  );
}

const RIDE_TONE: Record<RideConditions['label'], { stroke: string; text: string }> = {
  Good: { stroke: 'var(--ok)', text: 'text-ok' },
  Fair: { stroke: 'var(--accent-ink)', text: 'text-accent-ink' },
  Caution: { stroke: 'var(--warn)', text: 'text-warn' },
  Poor: { stroke: 'var(--danger)', text: 'text-danger' },
};

function RideGauge({ ride, riderAlerts }: { ride: RideConditions; riderAlerts: number }) {
  const tone = RIDE_TONE[ride.label];
  const arc = Math.PI * 52; // semicircle length for r = 52
  return (
    <section className="flex items-center gap-4 rounded-2xl border border-line bg-raised/50 px-4 py-3.5">
      <svg viewBox="0 0 120 68" className="h-[68px] w-[120px] shrink-0" aria-hidden>
        <path
          d="M8 62a52 52 0 0 1 104 0"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <motion.path
          d="M8 62a52 52 0 0 1 104 0"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={arc}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: arc * (1 - ride.score / 100) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <text x="60" y="58" textAnchor="middle" className="fill-fg font-mono text-[24px] font-semibold">
          {ride.score}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="hud text-subtle">Riding conditions</p>
        <p className={cn('text-xl font-bold tracking-tight', tone.text)}>{ride.label}</p>
        <p className="text-xs text-muted">
          {riderAlerts === 0
            ? 'No hazards for two-wheelers right now.'
            : `${riderAlerts} factor${riderAlerts > 1 ? 's' : ''} affecting riders.`}
        </p>
      </div>
    </section>
  );
}

function AlertCard({ alert, forecast }: { alert: WeatherAlert; forecast: Forecast }) {
  const style = SEVERITY_STYLE[alert.severity];
  const Icon = ALERT_ICONS[alert.kind];
  const when =
    alert.startsAt === null
      ? 'Now'
      : `From ${formatWallClock(localTimeAt(alert.startsAt, forecast.utcOffsetSeconds))}`;
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={cn('relative overflow-hidden rounded-2xl border bg-raised/50 py-3 pr-4 pl-5', style.border)}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', style.bg, style.text)}>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{alert.title}</p>
            <span className={cn('hud', style.text)}>{style.label}</span>
          </div>
          <p className="mt-0.5 hud text-subtle">
            {when}
            {alert.metric ? ` · ${alert.metric}` : ''}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{alert.advice}</p>
          <div className="mt-2 flex gap-1">
            {alert.audience.map((a) => (
              <Badge key={a}>{a === 'everyone' ? 'Everyone' : a === 'riders' ? 'Bikers' : 'Drivers'}</Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function hazardTone(h: HourlyPoint): string | null {
  if (isThunderstorm(h.code)) return 'bg-danger';
  if ((h.precipitationProbability >= 40 && h.precipitation >= 2.5) || h.windGusts >= 65 || h.visibility < 500)
    return 'bg-fire';
  if (isFogCode(h.code) || h.windGusts >= 45 || (h.precipitationProbability >= 40 && h.precipitation >= 0.5))
    return 'bg-warn';
  return null;
}

function HourlyStrip({ hours, offset, units }: { hours: HourlyPoint[]; offset: number; units: Units }) {
  return (
    <div className="-mx-4 scrollbar-none overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <ol className="flex w-max gap-1.5">
        {hours.map((h, i) => {
          const tone = hazardTone(h);
          return (
            <li
              key={h.time}
              className="relative flex w-[54px] flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-line bg-raised/50 px-1 pt-2.5 pb-2"
            >
              {tone && <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', tone)} />}
              <span className="font-mono text-[11px] text-subtle">
                {i === 0 ? 'Now' : localTimeAt(h.time, offset).slice(0, 2)}
              </span>
              <WeatherIcon code={h.code} isDay={h.isDay} size={18} className="text-muted" />
              <span className="font-mono text-[13px] font-semibold tabular-nums">
                {formatTemperature(h.temperature, units).replace(/°[CF]$/, '°')}
              </span>
              <span
                className="flex h-6 w-2 items-end overflow-hidden rounded-full bg-sunken"
                title={`${h.precipitationProbability}% chance of rain`}
              >
                <span
                  className="w-full rounded-full bg-police"
                  style={{ height: `${Math.max(4, h.precipitationProbability)}%` }}
                />
              </span>
              <span className="font-mono text-[10px] text-subtle tabular-nums">
                {h.precipitationProbability}%
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-raised/50 px-3.5 py-3">
      <span className="flex items-center gap-1.5 hud text-subtle">
        <Icon size={12} /> {label}
      </span>
      <span className="flex flex-col text-[17px] font-semibold">{children}</span>
    </div>
  );
}

function Sub({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-xs font-normal text-muted', className)}>{children}</span>;
}

function aqiInfo(aqi: number): { label: string; tone: string } {
  if (aqi <= 50) return { label: 'Good', tone: 'text-ok' };
  if (aqi <= 100) return { label: 'Moderate', tone: 'text-warn' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', tone: 'text-fire' };
  if (aqi <= 200) return { label: 'Unhealthy', tone: 'text-danger' };
  if (aqi <= 300) return { label: 'Very unhealthy', tone: 'text-danger' };
  return { label: 'Hazardous', tone: 'text-danger' };
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}
