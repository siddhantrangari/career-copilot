/**
 * A tracked company sits in the pipeline column of its furthest-along role,
 * so applying to one role moves the company even while another role there
 * is still Interested. Closed (failed) roles are ignored; the company closes
 * only when every role is closed.
 */
const ORDER = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'screening', 'interview', 'offer'];

export function companyStageFor(roles, fallback = 'new') {
  if (!Array.isArray(roles) || !roles.length) return fallback;
  const open = roles.map((r) => r.stage || 'new').filter((s) => s !== 'failed');
  if (!open.length) return 'failed';
  return open.reduce((best, s) => (ORDER.indexOf(s) > ORDER.indexOf(best) ? s : best), 'new');
}
