import { supabase } from '@/lib/supabase';

/**
 * 从数据库聚合公开作品中出现过的去重标签（RPC gallery_distinct_tags）
 */
export async function fetchGalleryDistinctTags(): Promise<string[]> {
  const { data, error } = await supabase.rpc('gallery_distinct_tags');
  if (error) {
    throw new Error(error.message || '加载标签失败');
  }
  const rows = (data ?? []) as { tag: string }[];
  return rows.map(function pickTag(r) {
    return r.tag;
  });
}
