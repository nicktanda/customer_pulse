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

ActiveRecord::Schema[8.0].define(version: 2026_02_06_102504) do
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
    t.index ["ai_processed_at"], name: "index_feedbacks_on_ai_processed_at"
    t.index ["category"], name: "index_feedbacks_on_category"
    t.index ["created_at"], name: "index_feedbacks_on_created_at"
    t.index ["priority"], name: "index_feedbacks_on_priority"
    t.index ["source", "source_external_id"], name: "index_feedbacks_on_source_and_source_external_id", unique: true
    t.index ["source"], name: "index_feedbacks_on_source"
    t.index ["source_external_id"], name: "index_feedbacks_on_source_external_id"
    t.index ["status"], name: "index_feedbacks_on_status"
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
end
