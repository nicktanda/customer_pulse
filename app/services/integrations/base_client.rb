module Integrations
  class BaseClient
    attr_reader :integration

    def initialize(integration)
      @integration = integration
    end

    def test_connection
      raise NotImplementedError, "Subclasses must implement test_connection"
    end

    def sync
      raise NotImplementedError, "Subclasses must implement sync"
    end

    protected

    def credentials
      @credentials ||= integration.parsed_credentials
    end
  end
end
