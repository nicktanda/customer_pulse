# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_02_07_000007) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "email_recipients", force: :cascade do |t|
    t.string "email", null: false
    t.string "name"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_email_recipients_on_active"
    t.index ["email"], name: "index_email_recipients_on_email", unique: true
  end

  create_table "feedback_insights", force: :cascade do |t|
    t.bigint "feedback_id", null: false
    t.bigint "insight_id", null: false
    t.float "relevance_score", default: 0.0
    t.text "contribution_summary"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feedback_id", "insight_id"], name: "index_feedback_insights_on_feedback_id_and_insight_id", unique: true
    t.index ["feedback_id"], name: "index_feedback_insights_on_feedback_id"
    t.index ["insight_id"], name: "index_feedback_insights_on_insight_id"
  end

  create_table "feedbacks", force: :cascade do |t|
    t.integer "source", null: false
    t.string "source_external_id"
    t.string "title"
    t.text "content"
    t.string "author_name"
    t.string "author_email"
    t.integer "category", default: 0, null: false
    t.integer "priority", default: 0, null: false
    t.integer "status", default: 0, null: false
    t.text "ai_summary"
    t.float "ai_confidence_score"
    t.datetime "ai_processed_at"
    t.boolean "manually_reviewed", default: false, null: false
    t.jsonb "raw_data", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "insight_processed_at"
    t.index ["ai_processed_at"], name: "index_feedbacks_on_ai_processed_at"
    t.index ["category"], name: "index_feedbacks_on_category"
    t.index ["created_at"], name: "index_feedbacks_on_created_at"
    t.index ["insight_processed_at"], name: "index_feedbacks_on_insight_processed_at"
    t.index ["priority"], name: "index_feedbacks_on_priority"
    t.index ["source", "source_external_id"], name: "index_feedbacks_on_source_and_source_external_id", unique: true
    t.index ["source"], name: "index_feedbacks_on_source"
    t.index ["source_external_id"], name: "index_feedbacks_on_source_external_id"
    t.index ["status"], name: "index_feedbacks_on_status"
  end

  create_table "idea_insights", force: :cascade do |t|
    t.bigint "idea_id", null: false
    t.bigint "insight_id", null: false
    t.integer "address_level", default: 0
    t.text "address_description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["idea_id", "insight_id"], name: "index_idea_insights_on_idea_id_and_insight_id", unique: true
    t.index ["idea_id"], name: "index_idea_insights_on_idea_id"
    t.index ["insight_id"], name: "index_idea_insights_on_insight_id"
  end

  create_table "idea_relationships", force: :cascade do |t|
    t.bigint "idea_id", null: false
    t.bigint "related_idea_id", null: false
    t.integer "relationship_type", default: 0, null: false
    t.text "explanation"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["idea_id", "related_idea_id"], name: "index_idea_relationships_on_idea_id_and_related_idea_id", unique: true
    t.index ["idea_id"], name: "index_idea_relationships_on_idea_id"
    t.index ["related_idea_id"], name: "index_idea_relationships_on_related_idea_id"
    t.index ["relationship_type"], name: "index_idea_relationships_on_relationship_type"
  end

  create_table "ideas", force: :cascade do |t|
    t.string "title", null: false
    t.text "description", null: false
    t.integer "idea_type", default: 0, null: false
    t.integer "effort_estimate", default: 0, null: false
    t.integer "impact_estimate", default: 0, null: false
    t.integer "confidence_score", default: 0
    t.integer "status", default: 0, null: false
    t.bigint "pm_persona_id"
    t.text "rationale"
    t.text "risks"
    t.jsonb "implementation_hints", default: []
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["effort_estimate"], name: "index_ideas_on_effort_estimate"
    t.index ["idea_type"], name: "index_ideas_on_idea_type"
    t.index ["impact_estimate"], name: "index_ideas_on_impact_estimate"
    t.index ["pm_persona_id"], name: "index_ideas_on_pm_persona_id"
    t.index ["status"], name: "index_ideas_on_status"
  end

  create_table "insight_stakeholders", force: :cascade do |t|
    t.bigint "insight_id", null: false
    t.bigint "stakeholder_segment_id", null: false
    t.integer "impact_level", default: 0
    t.text "impact_description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["insight_id", "stakeholder_segment_id"], name: "idx_insight_stakeholders_unique", unique: true
    t.index ["insight_id"], name: "index_insight_stakeholders_on_insight_id"
    t.index ["stakeholder_segment_id"], name: "index_insight_stakeholders_on_stakeholder_segment_id"
  end

  create_table "insight_themes", force: :cascade do |t|
    t.bigint "insight_id", null: false
    t.bigint "theme_id", null: false
    t.float "relevance_score", default: 0.0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["insight_id", "theme_id"], name: "index_insight_themes_on_insight_id_and_theme_id", unique: true
    t.index ["insight_id"], name: "index_insight_themes_on_insight_id"
    t.index ["theme_id"], name: "index_insight_themes_on_theme_id"
  end

  create_table "insights", force: :cascade do |t|
    t.string "title", null: false
    t.text "description", null: false
    t.integer "insight_type", default: 0, null: false
    t.integer "severity", default: 0, null: false
    t.integer "confidence_score", default: 0
    t.integer "affected_users_count", default: 0
    t.integer "feedback_count", default: 0
    t.integer "status", default: 0, null: false
    t.bigint "pm_persona_id"
    t.jsonb "evidence", default: []
    t.jsonb "metadata", default: {}
    t.datetime "discovered_at"
    t.datetime "addressed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["confidence_score"], name: "index_insights_on_confidence_score"
    t.index ["discovered_at"], name: "index_insights_on_discovered_at"
    t.index ["insight_type"], name: "index_insights_on_insight_type"
    t.index ["pm_persona_id"], name: "index_insights_on_pm_persona_id"
    t.index ["severity"], name: "index_insights_on_severity"
    t.index ["status"], name: "index_insights_on_status"
  end

  create_table "integrations", force: :cascade do |t|
    t.string "name", null: false
    t.integer "source_type", null: false
    t.text "credentials_ciphertext"
    t.string "webhook_secret"
    t.boolean "enabled", default: true, null: false
    t.datetime "last_synced_at"
    t.integer "sync_frequency_minutes", default: 15
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["enabled"], name: "index_integrations_on_enabled"
    t.index ["source_type"], name: "index_integrations_on_source_type"
  end

  create_table "pm_personas", force: :cascade do |t|
    t.string "name", null: false
    t.string "archetype", null: false
    t.text "description"
    t.text "system_prompt", null: false
    t.jsonb "priorities", default: []
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_pm_personas_on_active"
    t.index ["archetype"], name: "index_pm_personas_on_archetype", unique: true
  end

  create_table "pulse_reports", force: :cascade do |t|
    t.datetime "sent_at"
    t.datetime "period_start", null: false
    t.datetime "period_end", null: false
    t.integer "feedback_count", default: 0, null: false
    t.integer "recipient_count", default: 0, null: false
    t.text "summary"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["period_start", "period_end"], name: "index_pulse_reports_on_period_start_and_period_end"
    t.index ["sent_at"], name: "index_pulse_reports_on_sent_at"
  end

  create_table "stakeholder_segments", force: :cascade do |t|
    t.string "name", null: false
    t.integer "segment_type", default: 0, null: false
    t.text "description"
    t.integer "size_estimate", default: 0
    t.integer "engagement_priority", default: 0
    t.text "engagement_strategy"
    t.jsonb "characteristics", default: []
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["engagement_priority"], name: "index_stakeholder_segments_on_engagement_priority"
    t.index ["name"], name: "index_stakeholder_segments_on_name"
    t.index ["segment_type"], name: "index_stakeholder_segments_on_segment_type"
  end

  create_table "themes", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.integer "priority_score", default: 0
    t.integer "insight_count", default: 0
    t.integer "affected_users_estimate", default: 0
    t.jsonb "metadata", default: {}
    t.datetime "analyzed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["analyzed_at"], name: "index_themes_on_analyzed_at"
    t.index ["name"], name: "index_themes_on_name"
    t.index ["priority_score"], name: "index_themes_on_priority_score"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "name"
    t.integer "role", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "feedback_insights", "feedbacks"
  add_foreign_key "feedback_insights", "insights"
  add_foreign_key "idea_insights", "ideas"
  add_foreign_key "idea_insights", "insights"
  add_foreign_key "idea_relationships", "ideas"
  add_foreign_key "idea_relationships", "ideas", column: "related_idea_id"
  add_foreign_key "ideas", "pm_personas"
  add_foreign_key "insight_stakeholders", "insights"
  add_foreign_key "insight_stakeholders", "stakeholder_segments"
  add_foreign_key "insight_themes", "insights"
  add_foreign_key "insight_themes", "themes"
  add_foreign_key "insights", "pm_personas"
end
