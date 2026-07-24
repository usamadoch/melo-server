const STATIC_INTERESTS = [
  'AI',
  'Programming',
  'Startups',
  'Movies',
  'Books',
  'Fitness',
  'Gaming',
  'Business',
  'Music',
  'Travel',
];

export class InterestsService {
  static getInterests(): string[] {
    return STATIC_INTERESTS;
  }
}
