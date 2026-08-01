export interface SubcategoryDef {
  name: string;
}

export interface CategoryDef {
  name: string;
  subcategories: SubcategoryDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: 'Programming',
    subcategories: [
      { name: 'Web Development' },
      { name: 'AI & Machine Learning' },
      { name: 'Mobile Development' },
      { name: 'Game Development' },
      { name: 'DevOps & Cloud' },
      { name: 'Data Science' },
    ],
  },
  {
    name: 'AI',
    subcategories: [
      { name: 'LLMs & ChatGPT' },
      { name: 'Computer Vision' },
      { name: 'AI Art & Creative' },
      { name: 'AI Startups' },
      { name: 'Robotics' },
    ],
  },
  {
    name: 'Startups',
    subcategories: [
      { name: 'SaaS' },
      { name: 'Indie Hacking' },
      { name: 'Fundraising' },
      { name: 'Product Management' },
      { name: 'Growth & Marketing' },
    ],
  },
  {
    name: 'Business',
    subcategories: [
      { name: 'E-Commerce' },
      { name: 'Freelancing' },
      { name: 'Investing' },
      { name: 'Finance' },
      { name: 'Entrepreneurship' },
    ],
  },
  {
    name: 'Gaming',
    subcategories: [
      { name: 'PC Gaming' },
      { name: 'Console Gaming' },
      { name: 'Esports' },
      { name: 'Game Design' },
      { name: 'Retro Games' },
    ],
  },
  {
    name: 'Movies',
    subcategories: [
      { name: 'Sci-Fi & Fantasy' },
      { name: 'Horror' },
      { name: 'Anime' },
      { name: 'Documentaries' },
      { name: 'Film Making' },
    ],
  },
  {
    name: 'Music',
    subcategories: [
      { name: 'Production & Beats' },
      { name: 'Hip-Hop & Rap' },
      { name: 'Electronic & EDM' },
      { name: 'Instruments' },
      { name: 'Singing & Vocals' },
    ],
  },
  {
    name: 'Fitness',
    subcategories: [
      { name: 'Strength Training' },
      { name: 'Bodybuilding' },
      { name: 'Running & Cardio' },
      { name: 'Nutrition & Diet' },
      { name: 'Yoga & Flexibility' },
    ],
  },
  {
    name: 'Books',
    subcategories: [
      { name: 'Self-Improvement' },
      { name: 'Fiction & Novels' },
      { name: 'Non-Fiction' },
      { name: 'Philosophy' },
      { name: 'Science & Tech' },
    ],
  },
  {
    name: 'Travel',
    subcategories: [
      { name: 'Solo Travel' },
      { name: 'Budget Travel' },
      { name: 'Digital Nomad' },
      { name: 'Adventure Travel' },
      { name: 'Food & Culture' },
    ],
  },
];

export class InterestsService {
  static getCategories(): CategoryDef[] {
    return CATEGORIES;
  }

  /** Flat list of all category names */
  static getCategoryNames(): string[] {
    return CATEGORIES.map((c) => c.name);
  }

  /** Flat list of all subcategory names */
  static getAllSubcategoryNames(): string[] {
    return CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.name));
  }
}
