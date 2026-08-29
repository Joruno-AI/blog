export default function SiteLoading() {
  return (
    <div className="site-shell site-loading" aria-label="正在加载内容">
      <div className="site-loading__title" />
      <div className="site-loading__line" />
      <div className="site-loading__line site-loading__line--short" />
      <div className="site-loading__block" />
    </div>
  );
}
