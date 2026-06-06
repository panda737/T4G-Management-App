import { supabase } from './supabase';

export async function generateSequentialNumber(
  table: string,
  numberColumn: string,
  prefix: string,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const { data } = await supabase
    .from(table)
    .select(numberColumn)
    .like(numberColumn, `${prefix}-${year}-%`);

  const maxNum = (data || []).reduce((max, row) => {
    const match = row[numberColumn]?.match(/\d+$/);
    return Math.max(max, match ? parseInt(match[0]) : 0);
  }, 0);

  return `${prefix}-${year}-${String(maxNum + 1).padStart(4, '0')}`;
}
