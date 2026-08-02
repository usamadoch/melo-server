export enum SeverityTier {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL'
}

export const SEVERITY_MAP: Record<string, SeverityTier> = {
  // Manual report reasons (from existing Report model & new)
  'nudity': SeverityTier.SEVERE,
  'harassment': SeverityTier.SEVERE,
  'spam': SeverityTier.MINOR,
  'hate_speech': SeverityTier.SEVERE,
  'fake_camera': SeverityTier.MODERATE,
  'other': SeverityTier.MINOR,
  'low_engagement': SeverityTier.MINOR,
  'rudeness': SeverityTier.MINOR,
  'child_safety': SeverityTier.CRITICAL,
  'violence_threat': SeverityTier.CRITICAL,

  // OpenAI Moderation API categories mapping
  'hate': SeverityTier.SEVERE,
  'hate/threatening': SeverityTier.CRITICAL,
  'harassment/threatening': SeverityTier.SEVERE,
  'self-harm': SeverityTier.CRITICAL,
  'self-harm/intent': SeverityTier.CRITICAL,
  'self-harm/instructions': SeverityTier.CRITICAL,
  'sexual': SeverityTier.SEVERE,
  'sexual/minors': SeverityTier.CRITICAL,
  'violence': SeverityTier.SEVERE,
  'violence/graphic': SeverityTier.SEVERE,
  'illicit': SeverityTier.SEVERE,
  'illicit/violent': SeverityTier.CRITICAL
};

/**
 * Helper to get the severity tier for a given category, defaulting to MINOR.
 */
export const getSeverityTier = (category: string): SeverityTier => {
  return SEVERITY_MAP[category] || SeverityTier.MINOR;
};
