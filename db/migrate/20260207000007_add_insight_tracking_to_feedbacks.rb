# frozen_string_literal: true

class AddInsightTrackingToFeedbacks < ActiveRecord::Migration[8.0]
  def change
    add_column :feedbacks, :insight_processed_at, :datetime
    add_index :feedbacks, :insight_processed_at
  end
end
