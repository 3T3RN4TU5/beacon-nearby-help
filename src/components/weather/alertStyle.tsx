import {
  CloudFog,
  CloudLightning,
  CloudRain,
  Haze,
  Moon,
  Snowflake,
  Sun,
  Thermometer,
  ThermometerSnowflake,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { AlertKind, Severity } from '@/features/weather/alerts';

export const ALERT_ICONS: Record<AlertKind, LucideIcon> = {
  storm: CloudLightning,
  ice: ThermometerSnowflake,
  snow: Snowflake,
  rain: CloudRain,
  fog: CloudFog,
  wind: Wind,
  heat: Thermometer,
  cold: ThermometerSnowflake,
  uv: Sun,
  dark: Moon,
  air: Haze,
};

export const SEVERITY_STYLE: Record<
  Severity,
  { label: string; text: string; bg: string; border: string; bar: string }
> = {
  info: {
    label: 'Info',
    text: 'text-police',
    bg: 'bg-police/10',
    border: 'border-police/25',
    bar: 'bg-police',
  },
  advisory: {
    label: 'Advisory',
    text: 'text-warn',
    bg: 'bg-warn/10',
    border: 'border-warn/30',
    bar: 'bg-warn',
  },
  warning: {
    label: 'Warning',
    text: 'text-fire',
    bg: 'bg-fire/10',
    border: 'border-fire/35',
    bar: 'bg-fire',
  },
  danger: {
    label: 'Danger',
    text: 'text-danger',
    bg: 'bg-danger/12',
    border: 'border-danger/40',
    bar: 'bg-danger',
  },
};
