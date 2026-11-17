import {
  ArrowLeft,
  ArrowRight,
  ChartLine,
  Check,
  ChevronDown,
  ChevronUp,
  Delete,
  FastForward,
  Flag,
  Hand,
  Lightbulb,
  LoaderCircle,
  Medal,
  Minus,
  MonitorPlay,
  Music,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Pointer,
  Puzzle,
  Rocket,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Sparkles,
  Star,
  Table2,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

// one consistent icon set for the whole app (Lucide); data files refer to icons by name
const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  chart: ChartLine,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  backspace: Delete,
  forward: FastForward,
  flag: Flag,
  hand: Hand,
  lightbulb: Lightbulb,
  loader: LoaderCircle,
  medal: Medal,
  minus: Minus,
  explain: MonitorPlay,
  music: Music,
  notebook: NotebookPen,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  tap: Pointer,
  puzzle: Puzzle,
  rocket: Rocket,
  replay: RotateCcw,
  scale: Scale,
  search: Search,
  settings: Settings,
  sparkles: Sparkles,
  star: Star,
  table: Table2,
  target: Target,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  trophy: Trophy,
  volume: Volume2,
  mute: VolumeX,
  x: X,
  zap: Zap,
};

export default function Icon({ name, size = 22, stroke = 2.4, fill, className = '' }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp className={`ic ${className}`} size={size} strokeWidth={stroke} fill={fill || 'none'} aria-hidden="true" />;
}

/** the stars counter */
export function Stars({ n, big }) {
  return (
    <div className={`chip ${big ? 'big' : ''}`}>
      <Icon name="star" size={big ? 22 : 18} fill="currentColor" />
      {n}
    </div>
  );
}
