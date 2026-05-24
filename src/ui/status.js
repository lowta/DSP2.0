export function setStatus(element, type, message) {
  element.className = `notice ${type ? `notice--${type}` : ''}`.trim();
  element.textContent = message;
  element.hidden = !message;
}

export function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.dataset.loading = String(isLoading);
}
