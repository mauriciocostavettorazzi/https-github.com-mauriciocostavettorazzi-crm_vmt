type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;
let _toast: ToastFn | null = null;

export const registerToast = (fn: ToastFn) => {
  _toast = fn;
};

export const toast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
  if (_toast) _toast(msg, type);
};
