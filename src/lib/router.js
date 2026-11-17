import { useSyncExternalStore } from 'react';

// tiny hash router, so the tablet's Back button works: #/lesson/rate, #/practice/eq ...
const sub = (f) => {
  window.addEventListener('hashchange', f);
  return () => window.removeEventListener('hashchange', f);
};
const get = () => window.location.hash.replace(/^#\/?/, '');

export function useRoute() {
  const path = useSyncExternalStore(sub, get);
  return path.split('/').filter(Boolean);
}

export function go(path) {
  window.location.hash = '/' + path.replace(/^\//, '');
  window.scrollTo(0, 0);
}
