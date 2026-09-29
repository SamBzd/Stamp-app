import { ref, watch } from 'vue';

export function usePaperSearch(searchPapers, { delay = 200 } = {}) {
  const query = ref('');
  const results = ref([]);
  const searching = ref(false);
  const error = ref('');
  let timer;
  let version = 0;

  const cancelPending = () => {
    clearTimeout(timer);
    version += 1;
    searching.value = false;
  };

  const reset = () => {
    cancelPending();
    query.value = '';
    results.value = [];
    error.value = '';
  };

  const stopWatch = watch(query, value => {
    clearTimeout(timer);
    const token = ++version;
    const search = value.trim();
    error.value = '';
    results.value = [];

    if (!search) {
      searching.value = false;
      return;
    }

    searching.value = true;
    timer = setTimeout(async () => {
      try {
        const papers = await searchPapers(search);
        if (token === version) results.value = papers;
      } catch (failure) {
        if (token === version) error.value = failure.message;
      } finally {
        if (token === version) searching.value = false;
      }
    }, delay);
  });

  const stop = () => {
    cancelPending();
    stopWatch();
  };

  return { query, results, searching, error, reset, stop };
}
