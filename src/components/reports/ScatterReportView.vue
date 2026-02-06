
<script setup lang="ts">
import { computed } from 'vue';
import { useReportUtils } from '../../composables/useReportUtils';

const props = defineProps<{ data: any }>();
const { fmt } = useReportUtils();
const safeData = computed(() => props.data || {});
</script>

<template>
  <div class="stat-box">
    <div class="box-title">ScatterReportView</div>
    <div class="box-content">
      <pre>{{ safeData }}</pre>
    </div>
  </div>
</template>

<style scoped>
.stat-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
.box-title { font-weight: bold; margin-bottom: 5px; }
</style>
