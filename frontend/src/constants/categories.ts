export const CATEGORY_TREE: Record<string, string[]> = {
  Electronics: ['Audio', 'Computers', 'Mobile'],
  'Home Appliances': ['Kitchen', 'Cleaning', 'Climate'],
  Accessories: ['Bags', 'Chargers', 'Stands'],
  Other: ['Misc'],
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_TREE).map((key) => ({
  label: key,
  value: key,
}));

export function getSubCategoryOptions(category?: string) {
  if (!category || !CATEGORY_TREE[category]) return [];
  return CATEGORY_TREE[category].map((sub) => ({
    label: sub,
    value: sub,
  }));
}