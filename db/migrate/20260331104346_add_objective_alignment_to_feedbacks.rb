# frozen_string_literal: true

class AddObjectiveAlignmentToFeedbacks < ActiveRecord::Migration[8.0]
  def change
    add_column :feedbacks, :objective_alignment_score, :float
    add_column :feedbacks, :aligned_objective_ids, :jsonb, default: []

    add_index :feedbacks, :objective_alignment_score
  end
end
