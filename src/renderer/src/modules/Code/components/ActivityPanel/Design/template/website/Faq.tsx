import { SiteLayout } from './Layout';
import { FAQS } from './site';

export default function Faq() {
  return (
    <SiteLayout current="/faq">
      <section id="faq">
        <div className="w" style={{ maxWidth: 820 }}>
          <h2 className="rv">Questions</h2>
          <div style={{ marginTop: 30 }}>
            {FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}