/**
 * Wraps every dashboard page. Unlike the layout, a template is rebuilt on each
 * navigation, which is what lets the page fade and rise in every time.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
