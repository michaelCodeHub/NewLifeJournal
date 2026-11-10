/**
 * Escape user-provided text before interpolating it into generated HTML
 * (PDF reports, shared timelines) so names/notes can't inject markup.
 */
export const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
