export default function FeatureRequests() {
  return (
    <div className="bg-background min-h-full">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-4">Feature Requests</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Submit and track feature requests for the CMS Dashboard
        </p>

        <div className="bg-card rounded-lg border border-border p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💡</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Feature Requests Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              We're building a feature request system to collect and prioritize your ideas.
            </p>
            <div className="space-y-4 max-w-md mx-auto">
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-foreground mb-2">In the meantime, you can:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Submit requests via GitHub Issues</li>
                  <li>Contact your team lead with suggestions</li>
                  <li>Share feedback in team channels</li>
                </ul>
              </div>
              <a
                href="https://github.com/Shopify/CMS-Dash/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#008060] text-white rounded-lg hover:bg-[#006d4e] transition-colors"
              >
                <span>View GitHub Issues</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

