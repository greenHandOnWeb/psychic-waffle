<template>
  <!-- 独立组件 + Teleport：避免 Vue 3.5 在 App 根模板静态提升时破坏 Toaster 内部 ref 上下文 -->
  <Teleport to="body">
    <Toaster position="top-center" rich-colors />
  </Teleport>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>
