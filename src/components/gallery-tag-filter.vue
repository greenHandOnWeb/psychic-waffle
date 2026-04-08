<template>
  <div v-if="tags.length" class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
    <span class="text-xs text-slate-500">标签</span>
    <div class="relative min-w-[200px] flex-1 sm:max-w-md">
      <Listbox
        :model-value="modelValue"
        multiple
        @update:model-value="onUpdate"
      >
        <div class="relative">
          <ListboxButton
            class="relative w-full cursor-default rounded-lg border border-slate-600 bg-slate-950 py-2 pl-3 pr-10 text-left text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <span class="block truncate">{{ summaryText }}</span>
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown class="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
          </ListboxButton>
          <transition
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
          >
            <ListboxOptions
              class="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-600 bg-slate-900 py-1 text-sm shadow-xl focus:outline-none"
            >
              <ListboxOption
                v-for="t in tags"
                :key="t"
                v-slot="{ active, selected }"
                :value="t"
                as="template"
              >
                <li
                  class="relative cursor-pointer select-none px-3 py-2"
                  :class="active ? 'bg-slate-800 text-white' : 'text-slate-300'"
                >
                  <span class="flex items-center gap-2">
                    <span
                      class="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]"
                      :class="
                        selected
                          ? 'border-sky-500 bg-sky-600 text-white'
                          : 'border-slate-500 bg-slate-950'
                      "
                    >
                      {{ selected ? '✓' : '' }}
                    </span>
                    <span class="truncate">{{ t }}</span>
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Listbox>
    </div>
    <button
      v-if="modelValue.length"
      type="button"
      class="shrink-0 text-xs text-slate-500 underline hover:text-slate-300"
      @click="clearFilter"
    >
      清除筛选
    </button>
  </div>
</template>

<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { ChevronDown } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
  tags: string[];
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const summaryText = computed(function summaryTextComputed() {
  const n = props.modelValue.length;
  if (n === 0) {
    return '选择标签（可多选）';
  }
  if (n <= 2) {
    return props.modelValue.join('、');
  }
  return `已选 ${n} 个标签`;
});

function onUpdate(next: string[]) {
  emit('update:modelValue', next);
}

function clearFilter() {
  emit('update:modelValue', []);
}
</script>
