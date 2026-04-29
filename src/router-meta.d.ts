import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** 浏览器标签标题片段，展示为「{title} · 灵动画册」 */
    title?: string;
  }
}
