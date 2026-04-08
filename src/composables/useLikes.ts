import { supabase } from '@/lib/supabase';

export interface ToggleLikeResult {
  liked: boolean;
  likes_count: number;
}

/**
 * 切换对某张作品的点赞（数据库：public.likes + 触发器维护 likes_count）
 */
export async function toggleImageLikeRpc(imageId: string): Promise<ToggleLikeResult> {
  const { data, error } = await supabase.rpc('toggle_image_like', {
    p_image_id: imageId,
  });
  if (error) {
    throw new Error(error.message || '点赞失败');
  }
  const row = data as ToggleLikeResult | null;
  if (!row || typeof row.liked !== 'boolean' || typeof row.likes_count !== 'number') {
    throw new Error('点赞返回数据异常');
  }
  return row;
}
