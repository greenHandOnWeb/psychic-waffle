import { filters, type FabricImage } from 'fabric';

const MOCK_ENHANCE_DELAY_MS = 420;

/**
 * Mock「AI 优化」：延迟后叠加轻微 Brightness，仅当前会话预览（未写回新图 URL）。
 */
export async function mockAiEnhanceFabricImage(img: FabricImage): Promise<void> {
  await new Promise<void>(function waitEnhance(r) {
    setTimeout(r, MOCK_ENHANCE_DELAY_MS);
  });
  if (!img.filters) {
    img.filters = [];
  }
  img.filters.push(
    new filters.Brightness({
      brightness: 0.07,
    })
  );
  img.applyFilters();
}
