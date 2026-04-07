import { createRouter, createWebHistory } from 'vue-router';

const GalleryView = () => import('@/views/gallery.vue');
const EditorView = () => import('@/views/editor.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'gallery', component: GalleryView },
    { path: '/editor/:id?', name: 'editor', component: EditorView, props: true },
  ],
});

export default router;
