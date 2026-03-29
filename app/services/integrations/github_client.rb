# frozen_string_literal: true

require 'erb'

module Integrations
  class GithubClient < BaseClient
    API_BASE = "https://api.github.com"

    def test_connection
      response = api_get("/repos/#{owner}/#{repo}")

      if response[:success]
        {
          success: true,
          message: "Connected to #{response[:data]['full_name']} (#{response[:data]['default_branch']})"
        }
      else
        { success: false, message: response[:error] }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      { success: true, created: 0, message: "GitHub integration does not sync feedback" }
    end

    def fetch_repo_tree(sha: nil)
      ref = sha || default_branch
      response = api_get("/repos/#{owner}/#{repo}/git/trees/#{ref}?recursive=1")

      return { success: false, error: response[:error] } unless response[:success]

      tree = response[:data]["tree"] || []
      {
        success: true,
        sha: response[:data]["sha"],
        tree: tree.select { |item| item["type"] == "blob" }.map { |item| item["path"] }
      }
    end

    def fetch_file_content(path, ref: nil)
      ref ||= default_branch
      # URL encode the path to handle special characters
      encoded_path = path.split('/').map { |segment| ERB::Util.url_encode(segment) }.join('/')
      response = api_get("/repos/#{owner}/#{repo}/contents/#{encoded_path}?ref=#{ref}")

      return { success: false, error: response[:error] } unless response[:success]

      content = Base64.decode64(response[:data]["content"]) rescue nil
      {
        success: true,
        content: content,
        sha: response[:data]["sha"],
        size: response[:data]["size"]
      }
    end

    def create_branch(branch_name, from_sha: nil)
      from_sha ||= get_latest_commit_sha

      response = api_post("/repos/#{owner}/#{repo}/git/refs", {
        ref: "refs/heads/#{branch_name}",
        sha: from_sha
      })

      if response[:success]
        { success: true, ref: response[:data]["ref"] }
      else
        { success: false, error: response[:error] }
      end
    end

    def create_or_update_file(path, content, message, branch:, sha: nil)
      payload = {
        message: message,
        content: Base64.strict_encode64(content),
        branch: branch
      }
      payload[:sha] = sha if sha

      # URL encode the path to handle special characters
      encoded_path = path.split('/').map { |segment| ERB::Util.url_encode(segment) }.join('/')
      response = api_put("/repos/#{owner}/#{repo}/contents/#{encoded_path}", payload)

      if response[:success]
        { success: true, commit_sha: response[:data].dig("commit", "sha") }
      else
        { success: false, error: response[:error] }
      end
    end

    def create_pull_request(title:, body:, head:, base: nil)
      base ||= default_branch

      response = api_post("/repos/#{owner}/#{repo}/pulls", {
        title: title,
        body: body,
        head: head,
        base: base
      })

      if response[:success]
        {
          success: true,
          pr_number: response[:data]["number"],
          pr_url: response[:data]["html_url"]
        }
      else
        { success: false, error: response[:error] }
      end
    end

    def merge_pull_request(pr_number, commit_message: nil)
      payload = { merge_method: "squash" }
      payload[:commit_message] = commit_message if commit_message

      response = api_put("/repos/#{owner}/#{repo}/pulls/#{pr_number}/merge", payload)

      if response[:success]
        { success: true, sha: response[:data]["sha"] }
      else
        { success: false, error: response[:error] }
      end
    end

    def get_pull_request(pr_number)
      response = api_get("/repos/#{owner}/#{repo}/pulls/#{pr_number}")

      if response[:success]
        { success: true, data: response[:data] }
      else
        { success: false, error: response[:error] }
      end
    end

    def get_combined_status(ref)
      response = api_get("/repos/#{owner}/#{repo}/commits/#{ref}/status")

      if response[:success]
        { success: true, state: response[:data]["state"], statuses: response[:data]["statuses"] }
      else
        { success: false, error: response[:error] }
      end
    end

    def get_latest_commit_sha(branch: nil)
      branch ||= default_branch
      response = api_get("/repos/#{owner}/#{repo}/git/refs/heads/#{branch}")
      response[:data]&.dig("object", "sha")
    end

    def owner
      credentials["owner"]
    end

    def repo
      credentials["repo"]
    end

    def default_branch
      credentials["default_branch"] || "main"
    end

    private

    def access_token
      credentials["access_token"]
    end

    def api_get(path)
      response = connection.get(path)
      parse_response(response)
    rescue Faraday::Error => e
      { success: false, error: e.message }
    end

    def api_post(path, body)
      response = connection.post(path) do |req|
        req.body = body.to_json
      end
      parse_response(response)
    rescue Faraday::Error => e
      { success: false, error: e.message }
    end

    def api_put(path, body)
      response = connection.put(path) do |req|
        req.body = body.to_json
      end
      parse_response(response)
    rescue Faraday::Error => e
      { success: false, error: e.message }
    end

    def connection
      @connection ||= Faraday.new(url: API_BASE) do |f|
        f.request :url_encoded
        f.headers["Authorization"] = "Bearer #{access_token}"
        f.headers["Accept"] = "application/vnd.github+json"
        f.headers["X-GitHub-Api-Version"] = "2022-11-28"
        f.headers["Content-Type"] = "application/json"
      end
    end

    def parse_response(response)
      data = JSON.parse(response.body) rescue {}

      if response.success?
        { success: true, data: data }
      else
        error_message = data["message"] || "HTTP #{response.status}"
        { success: false, error: error_message }
      end
    end
  end
end
