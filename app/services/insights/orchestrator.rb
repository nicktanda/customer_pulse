# frozen_string_literal: true

module Insights
  class Orchestrator
    def initialize(pm_persona: nil)
      @pm_persona = pm_persona || PmPersona.active.first
    end

    def run_full_pipeline(feedbacks: nil)
      feedbacks ||= Feedback.ready_for_insights.limit(100)
      return empty_result if feedbacks.empty?

      Rails.logger.info("Starting insights pipeline for #{feedbacks.count} feedbacks")

      results = {
        feedbacks_analyzed: feedbacks.count,
        insights_created: 0,
        themes_created: 0,
        ideas_created: 0,
        stakeholders_identified: 0,
        relationships_linked: 0
      }

      insights = discover_insights(feedbacks, results)
      return results if insights.empty?

      identify_themes(insights, results)
      generate_ideas(insights, results)
      identify_stakeholders(insights, results)
      link_ideas(results)

      Rails.logger.info("Insights pipeline completed: #{results}")
      results
    end

    def run_insight_discovery(feedbacks: nil)
      feedbacks ||= Feedback.ready_for_insights.limit(100)
      return { insights: [], created: 0 } if feedbacks.empty?

      discoverer = Ai::InsightDiscoverer.new(pm_persona: @pm_persona)
      discoverer.discover(feedbacks)
    end

    def run_theme_analysis(insights: nil)
      insights ||= Insight.actionable
      return { themes: [], created: 0 } if insights.empty?

      identifier = Ai::ThemeIdentifier.new(pm_persona: @pm_persona)
      identifier.identify(insights)
    end

    def run_idea_generation(insights: nil)
      insights ||= Insight.actionable.where("ideas_count = 0 OR ideas_count IS NULL")
      return { ideas: [], created: 0 } if insights.empty?

      generator = Ai::IdeaGenerator.new(pm_persona: @pm_persona)
      generator.generate_batch(insights)
    end

    def run_stakeholder_identification(insights: nil)
      insights ||= Insight.actionable
      return { stakeholders: [], created: 0 } if insights.empty?

      identifier = Ai::StakeholderIdentifier.new(pm_persona: @pm_persona)
      identifier.identify_batch(insights)
    end

    def run_idea_linking(ideas: nil)
      ideas ||= Idea.actionable
      return { relationships: [], created: 0 } if ideas.count < 2

      linker = Ai::IdeaLinker.new(pm_persona: @pm_persona)
      linker.link(ideas)
    end

    def build_attack_groups(insights: nil, ideas: nil, themes: nil)
      insights ||= Insight.actionable.includes(:themes, :ideas)
      ideas ||= Idea.actionable
      themes ||= Theme.by_priority

      return { groups: [] } if insights.empty? && ideas.empty?

      builder = Ai::AttackGroupBuilder.new(pm_persona: @pm_persona)
      builder.build(insights: insights, ideas: ideas, themes: themes)
    end

    private

    def empty_result
      {
        feedbacks_analyzed: 0,
        insights_created: 0,
        themes_created: 0,
        ideas_created: 0,
        stakeholders_identified: 0,
        relationships_linked: 0
      }
    end

    def discover_insights(feedbacks, results)
      discoverer = Ai::InsightDiscoverer.new(pm_persona: @pm_persona)
      result = discoverer.discover(feedbacks)

      results[:insights_created] = result[:created]
      result[:insights] || []
    end

    def identify_themes(insights, results)
      return if insights.empty?

      identifier = Ai::ThemeIdentifier.new(pm_persona: @pm_persona)
      result = identifier.identify(insights)

      results[:themes_created] = result[:created]
    end

    def generate_ideas(insights, results)
      return if insights.empty?

      generator = Ai::IdeaGenerator.new(pm_persona: @pm_persona)
      result = generator.generate_batch(insights)

      results[:ideas_created] = result[:created]
    end

    def identify_stakeholders(insights, results)
      return if insights.empty?

      identifier = Ai::StakeholderIdentifier.new(pm_persona: @pm_persona)
      result = identifier.identify_batch(insights)

      results[:stakeholders_identified] = result[:created]
    end

    def link_ideas(results)
      ideas = Idea.where("created_at > ?", 24.hours.ago)
      return if ideas.count < 2

      linker = Ai::IdeaLinker.new(pm_persona: @pm_persona)
      result = linker.link(ideas)

      results[:relationships_linked] = result[:created]
    end
  end
end
