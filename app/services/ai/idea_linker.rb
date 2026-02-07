# frozen_string_literal: true

module Ai
  class IdeaLinker < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert at identifying relationships between product ideas.
      Analyze the ideas and determine how they relate to each other.

      Relationship types:
      - complementary: Ideas that work well together
      - alternative: Different approaches to the same problem
      - prerequisite: One idea must be done before another
      - conflicts: Ideas that contradict or would interfere with each other
      - extends: One idea builds upon another

      For each relationship found:
      1. Identify the two ideas by their indices (0-based)
      2. Classify the relationship type
      3. Explain why this relationship exists

      Respond in JSON format:
      {
        "relationships": [
          {
            "idea_index": 0,
            "related_idea_index": 2,
            "relationship_type": "complementary|alternative|prerequisite|conflicts|extends",
            "explanation": "Why these ideas are related"
          }
        ]
      }

      Guidelines:
      - Only identify meaningful relationships
      - Don't force relationships that don't exist
      - Prerequisite means idea_index must be done before related_idea_index
      - Be specific in explanations
    PROMPT

    def link(ideas)
      return { relationships: [], created: 0 } if ideas.count < 2

      ideas_array = ideas.to_a
      result = analyze_ideas(ideas_array)

      if result[:error]
        Rails.logger.error("Idea linking failed: #{result[:error]}")
        return { relationships: [], created: 0, error: result[:error] }
      end

      created = create_relationships_from_result(result, ideas_array)

      { relationships: created, created: created.count }
    end

    private

    def analyze_ideas(ideas)
      prompt = build_ideas_prompt(ideas)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT)
    end

    def build_ideas_prompt(ideas)
      parts = ["Analyze relationships between the following #{ideas.count} ideas:\n"]

      ideas.each_with_index do |idea, index|
        parts << "--- Idea ##{index} ---"
        parts << "Title: #{idea.title}"
        parts << "Description: #{idea.description}"
        parts << "Type: #{idea.idea_type}"
        parts << "Effort: #{idea.effort_estimate}"
        parts << "Impact: #{idea.impact_estimate}"
        parts << ""
      end

      parts.join("\n")
    end

    def create_relationships_from_result(result, ideas)
      created_relationships = []

      relationships_data = result[:relationships] || []
      relationships_data.each do |rel_data|
        relationship = create_relationship(rel_data, ideas)
        created_relationships << relationship if relationship
      end

      created_relationships
    end

    def create_relationship(data, ideas)
      idea = ideas[data[:idea_index]]
      related_idea = ideas[data[:related_idea_index]]

      return nil unless idea && related_idea
      return nil if idea.id == related_idea.id

      existing = IdeaRelationship.find_by(idea: idea, related_idea: related_idea)
      return existing if existing

      IdeaRelationship.create!(
        idea: idea,
        related_idea: related_idea,
        relationship_type: data[:relationship_type],
        explanation: data[:explanation]
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Failed to create idea relationship: #{e.message}")
      nil
    end
  end
end
