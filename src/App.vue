<template>
  <div class="flex min-h-full flex-col">
    <header
      class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <RouterLink
          to="/"
          class="text-lg font-semibold text-white hover:text-sky-400"
        >
          灵动画册
        </RouterLink>
        <nav class="flex items-center gap-3 text-sm">
          <RouterLink
            to="/"
            class="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            active-class="!bg-slate-800 !text-white"
          >
            画廊
          </RouterLink>
          <RouterLink
            to="/editor"
            class="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            active-class="!bg-slate-800 !text-white"
          >
            拼图编辑
          </RouterLink>
          <RouterLink
            to="/settings"
            class="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            active-class="!bg-slate-800 !text-white"
          >
            设置
          </RouterLink>
          <button
            type="button"
            class="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="关于"
            aria-label="关于项目"
            @click="aboutOpen = true"
          >
            <CircleHelp
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <RouterView />
    </main>
    <AppToaster />

    <TransitionRoot appear :show="aboutOpen" as="div" class="contents">
      <Dialog
        class="relative z-50"
        @close="aboutOpen = false"
      >
        <TransitionChild
          as="div"
          class="fixed inset-0 bg-black/60"
          aria-hidden="true"
          enter="ease-out duration-200"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="div"
            class="w-full max-w-md"
            enter="ease-out duration-200"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <div class="w-full max-w-md">
              <DialogPanel
                class="w-full rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
              >
              <DialogTitle class="text-lg font-semibold text-white">
                关于灵动画册
              </DialogTitle>
              <p class="mt-3 text-sm leading-relaxed text-slate-300">
                上传图片、Mock
                AI
                打标签，使用云端模板或自由排版生成拼图海报。默认开发环境为 Mock 数据；接入 Supabase 后请关闭 Mock
                并执行迁移 SQL。
              </p>
              <button
                type="button"
                class="mt-6 w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500"
                @click="aboutOpen = false"
              >
                关闭
              </button>
              </DialogPanel>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import AppToaster from '@/components/app-toaster.vue';
import { CircleHelp } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  ensureMockSession,
  ensureSupabaseAuthSession,
  isSupabaseMockMode,
} from '@/lib/supabase';

const aboutOpen = ref(false);

onMounted(function appBoot() {
  if (isSupabaseMockMode()) {
    ensureMockSession().catch(function onBootErr(e) {
      console.error(e);
      toast.error('Mock 会话初始化失败');
    });
    return;
  }
  ensureSupabaseAuthSession().catch(function onRealBootErr(e) {
    console.error('[App] ensureSupabaseAuthSession', e);
    const msg = e instanceof Error ? e.message : String(e);
    toast.error(msg, { duration: 12000 });
  });
});
</script>
