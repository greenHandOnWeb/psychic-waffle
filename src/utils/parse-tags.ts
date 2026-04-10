import { MAX_IMAGE_TAGS } from '@/data';

/**
 * 将输入框中的「逗号 / 中文逗号 / 分号 / 空白」分隔字符串解析为标签列表
 */
export function parseTagsInput(raw: string): string[] {
  if (!raw || typeof raw !== 'string') {
    return [];
  }
  const parts = raw.split(/[,，;\s]+/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i].trim();
    if (t.length) {
      out.push(t);
    }
  }
  return out;
}

/**
 * 合并多组标签并去重（按完全相同的字符串，保留先出现的顺序），并截断到上限
 */
export function mergeUniqueTagGroups(groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let g = 0; g < groups.length; g++) {
    const list = groups[g];
    for (let i = 0; i < list.length; i++) {
      const t = list[i].trim();
      if (!t || seen.has(t)) {
        continue;
      }
      seen.add(t);
      out.push(t);
      if (out.length >= MAX_IMAGE_TAGS) {
        return out;
      }
    }
  }
  return out;
}
