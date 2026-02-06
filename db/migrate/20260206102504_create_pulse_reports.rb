class CreatePulseReports < ActiveRecord::Migration[8.0]
  def change
    create_table :pulse_reports do |t|
      t.datetime :sent_at
      t.datetime :period_start, null: false
      t.datetime :period_end, null: false
      t.integer :feedback_count, default: 0, null: false
      t.integer :recipient_count, default: 0, null: false
      t.text :summary

      t.timestamps
    end

    add_index :pulse_reports, :sent_at
    add_index :pulse_reports, [:period_start, :period_end]
  end
end
