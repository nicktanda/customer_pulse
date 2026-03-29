# frozen_string_literal: true

class Skill < ApplicationRecord
  belongs_to :user
  belongs_to :project, optional: true

  validates :name, presence: true, uniqueness: true,
                   format: { with: /\A[a-z0-9-]+\z/, message: "can only contain lowercase letters, numbers, and hyphens" }
  validates :title, presence: true
  validates :content, presence: true

  before_validation :generate_name_from_title, on: :create, if: -> { name.blank? && title.present? }
  after_save :sync_to_filesystem
  after_destroy :remove_from_filesystem

  def skill_directory
    Rails.root.join(".claude", "skills", name)
  end

  def skill_file_path
    skill_directory.join("SKILL.md")
  end

  def sync_to_filesystem
    FileUtils.mkdir_p(skill_directory)
    File.write(skill_file_path, full_content)
  end

  def remove_from_filesystem
    FileUtils.rm_rf(skill_directory) if skill_directory.exist?
  end

  def full_content
    <<~MARKDOWN
      ---
      title: #{title}
      description: #{description}
      ---

      #{content}
    MARKDOWN
  end

  private

  def generate_name_from_title
    self.name = title.parameterize
  end
end
