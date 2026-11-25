import React from 'react';
import {
  BookOpenIcon,
  CompassIcon,
  FlowerIcon,
  GamepadIcon,
  GiftIcon,
  ImageVaultIcon,
  LockIcon,
  MailIcon,
  SparklesIcon,
  StarsIcon,
} from '../../components/icons/UniverseIcons';

export const MODULE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: SparklesIcon,
  compass: CompassIcon,
  'book-open': BookOpenIcon,
  image: ImageVaultIcon,
  mail: MailIcon,
  flower: FlowerIcon,
  gamepad: GamepadIcon,
  gift: GiftIcon,
  lock: LockIcon,
  stars: StarsIcon,
};

export function getModuleIconComponent(
  iconName?: string | null
): React.ComponentType<{ className?: string }> {
  if (!iconName) return SparklesIcon;
  return MODULE_ICON_MAP[iconName] || SparklesIcon;
}
