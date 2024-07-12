const API_ROOT = import.meta.env.VITE_API_ROOT;

const IS_WARP_LOCAL = import.meta.env.VITE_WARP_SOURCE === 'local';

export { API_ROOT, IS_WARP_LOCAL };
