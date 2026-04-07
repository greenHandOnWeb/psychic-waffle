/** Mock AI 标签：延迟 + 本地词库随机组合（不接真实大模型） */

const TAG_POOL = [
  '风景',
  '人像',
  '静物',
  '建筑',
  '夜景',
  '自然光',
  '暖色调',
  '冷色调',
  '高对比',
  '柔焦',
  '街拍',
  '旅行',
  '生活记录',
  '极简',
  '复古',
];

const MOCK_TAG_DELAY_MS = 280;

function shufflePick(count: number): string[] {
  const copy = TAG_POOL.slice();
  const out: string[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * copy.length);
    out.push(copy[j]);
    copy.splice(j, 1);
  }
  return out;
}

/**
 * 根据上传文件生成 Mock 标签（不读取文件内容，仅模拟耗时）
 */
export async function generateMockTags(file: File): Promise<string[]> {
  void file;
  await new Promise<void>(function waitTags(r) {
    setTimeout(r, MOCK_TAG_DELAY_MS);
  });
  const count = 2 + Math.floor(Math.random() * 3);
  return shufflePick(count);
}
