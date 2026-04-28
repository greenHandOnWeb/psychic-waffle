import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from 'vue-router';
import { DEFAULT_SITE_DOC_TITLE, SHARE_POSTER_ROUTE_NAME } from '@/data';

const GalleryView = () => import('@/views/gallery.vue');
const EditorView = () => import('@/views/editor.vue');
const SettingsView = () => import('@/views/settings.vue');
const ShareView = () => import('@/views/share-view.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: function scrollToTop() {
    return { top: 0, left: 0 };
  },
  routes: [
    { path: '/', name: 'gallery', component: GalleryView, meta: { title: '画廊' } },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: EditorView,
      props: true,
      meta: { title: '拼图编辑' },
    },
    {
      path: '/s/:id',
      name: SHARE_POSTER_ROUTE_NAME,
      component: ShareView,
      meta: { title: '分享' },
    },
    { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '设置' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
  ],
});

router.afterEach(function syncDocumentTitle(to: RouteLocationNormalizedLoaded) {
  const piece = typeof to.meta.title === 'string' ? to.meta.title.trim() : '';
  document.title = piece ? `${piece} · ${DEFAULT_SITE_DOC_TITLE}` : DEFAULT_SITE_DOC_TITLE;
});

export default router;
