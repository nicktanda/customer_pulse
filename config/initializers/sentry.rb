# Optional Sentry integration (production only — gem is in the :production group).
# Set SENTRY_DSN in the deployment environment; never commit real DSN values.
if defined?(Sentry) && ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.breadcrumbs_logger = [ :active_support_logger, :http_logger ]
    # Performance monitoring off by default; raise in Sentry UI if you enable tracing.
    config.traces_sample_rate = 0.0
  end
end
