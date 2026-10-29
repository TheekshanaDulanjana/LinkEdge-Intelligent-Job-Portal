import {
  Search, GraduationCap, Mic, BarChart3, ShieldCheck, ClipboardCheck, Sparkles, Target, Users, Zap,
  FileText, Briefcase, Award, TrendingUp, Clock, Lock, Rocket, Heart, Globe, MessageSquare,
  type LucideIcon,
} from 'lucide-react';

/** Icons an admin can pick for a feature point. Names must match the backend list (admin/content.ts). */
export const ICON_MAP: Record<string, LucideIcon> = {
  Search, GraduationCap, Mic, BarChart3, ShieldCheck, ClipboardCheck, Sparkles, Target, Users, Zap,
  FileText, Briefcase, Award, TrendingUp, Clock, Lock, Rocket, Heart, Globe, MessageSquare,
};
export const ICON_NAMES = Object.keys(ICON_MAP);
export const iconFor = (name: string): LucideIcon => ICON_MAP[name] ?? Sparkles;
