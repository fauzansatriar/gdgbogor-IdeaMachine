import {
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  Camera,
  Car,
  CloudRain,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Hospital,
  Laptop,
  Mic,
  MonitorSmartphone,
  Radio,
  Recycle,
  ShoppingBag,
  Smartphone,
  Store,
  Tablet,
  Train,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { PoolIconName } from '../data/pools';

interface ReelIconProps {
  name: PoolIconName;
  className?: string;
}

export function ReelIcon({ name, className = 'w-5 h-5' }: ReelIconProps) {
  switch (name) {
    case 'utensils':
      return <Utensils className={className} aria-hidden="true" />;
    case 'hospital':
      return <Hospital className={className} aria-hidden="true" />;
    case 'recycle':
      return <Recycle className={className} aria-hidden="true" />;
    case 'wallet':
      return <Wallet className={className} aria-hidden="true" />;
    case 'cloud-rain':
      return <CloudRain className={className} aria-hidden="true" />;
    case 'file-text':
      return <FileText className={className} aria-hidden="true" />;
    case 'store':
      return <Store className={className} aria-hidden="true" />;
    case 'graduation-cap':
      return <GraduationCap className={className} aria-hidden="true" />;
    case 'train':
      return <Train className={className} aria-hidden="true" />;
    case 'home':
      return <Home className={className} aria-hidden="true" />;
    case 'users':
      return <Users className={className} aria-hidden="true" />;
    case 'camera':
      return <Camera className={className} aria-hidden="true" />;
    case 'globe':
      return <Globe className={className} aria-hidden="true" />;
    case 'radio':
      return <Radio className={className} aria-hidden="true" />;
    case 'mic':
      return <Mic className={className} aria-hidden="true" />;
    case 'calculator':
      return <Calculator className={className} aria-hidden="true" />;
    case 'calendar':
      return <Calendar className={className} aria-hidden="true" />;
    case 'shopping-bag':
      return <ShoppingBag className={className} aria-hidden="true" />;
    case 'heart-pulse':
      return <HeartPulse className={className} aria-hidden="true" />;
    case 'car':
      return <Car className={className} aria-hidden="true" />;
    case 'book-open':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'bell':
      return <Bell className={className} aria-hidden="true" />;
    case 'laptop':
      return <Laptop className={className} aria-hidden="true" />;
    case 'tablet':
      return <Tablet className={className} aria-hidden="true" />;
    case 'monitor-smartphone':
      return <MonitorSmartphone className={className} aria-hidden="true" />;
    case 'smartphone':
    default:
      return <Smartphone className={className} aria-hidden="true" />;
  }
}
