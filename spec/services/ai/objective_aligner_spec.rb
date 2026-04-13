require 'rails_helper'

RSpec.describe Ai::ObjectiveAligner do
  let(:project) { create(:project) }
  let(:feedback) { create(:feedback, project: project, content: 'We need better reporting features') }
  let(:mock_client) { instance_double(Anthropic::Client) }
  let(:mock_messages) { instance_double('Messages') }

  before do
    allow(Anthropic::Client).to receive(:new).and_return(mock_client)
    allow(mock_client).to receive(:messages).and_return(mock_messages)
  end

  let(:aligner) { described_class.new(project: project) }

  let(:objectives) do
    [
      {
        id: 1,
        title: 'Increase Revenue',
        description: 'Grow MRR to $100K',
        type: 'revenue',
        priority: 'critical',
        success_metrics: 'MRR > $100K'
      },
      {
        id: 2,
        title: 'Improve User Retention',
        description: 'Reduce churn rate',
        type: 'retention',
        priority: 'high',
        success_metrics: 'Churn < 5%'
      }
    ]
  end

  describe '#analyze_feedback' do
    let(:ai_response) do
      {
        'alignment_score' => 0.85,
        'aligned_objective_ids' => [1],
        'contradicted_objective_ids' => [],
        'analysis' => 'Better reporting supports revenue growth by improving user value',
        'business_impact' => 'High positive impact on retention and upsell potential'
      }
    end

    let(:mock_response) do
      double('Response',
        content: [double('Content', text: ai_response.to_json)],
        stop_reason: 'end_turn'
      )
    end

    before do
      allow(mock_messages).to receive(:create).and_return(mock_response)
    end

    it 'returns alignment analysis' do
      result = aligner.analyze_feedback(feedback, objectives: objectives)

      expect(result[:alignment_score]).to eq(0.85)
      expect(result[:aligned_objective_ids]).to eq([1])
      expect(result[:contradicted_objective_ids]).to eq([])
      expect(result[:analysis]).to be_present
      expect(result[:business_impact]).to be_present
    end

    context 'when no objectives are provided' do
      it 'returns default result with neutral score' do
        result = aligner.analyze_feedback(feedback, objectives: [])

        expect(result[:alignment_score]).to eq(0.5)
        expect(result[:aligned_objective_ids]).to eq([])
        expect(result[:analysis]).to eq('No objectives defined for alignment analysis')
      end
    end

    context 'when AI API fails' do
      before do
        allow(mock_messages).to receive(:create).and_raise(StandardError.new('API Error'))
      end

      it 'returns default result' do
        result = aligner.analyze_feedback(feedback, objectives: objectives)

        expect(result[:alignment_score]).to eq(0.5)
        expect(result[:aligned_objective_ids]).to eq([])
      end
    end
  end

  describe '#analyze_insight' do
    let(:insight) do
      double('Insight',
        id: 1,
        title: 'Users need better export options',
        description: 'Multiple users requested CSV export',
        insight_type: 'user_need',
        severity: 'moderate',
        affected_users_count: 150,
        project: project
      )
    end

    let(:ai_response) do
      {
        'alignment_score' => 0.75,
        'aligned_objective_ids' => [1, 2],
        'contradicted_objective_ids' => [],
        'analysis' => 'Export features support both revenue and retention goals',
        'business_impact' => 'Moderate positive impact'
      }
    end

    let(:mock_response) do
      double('Response',
        content: [double('Content', text: ai_response.to_json)],
        stop_reason: 'end_turn'
      )
    end

    before do
      allow(mock_messages).to receive(:create).and_return(mock_response)
    end

    it 'returns alignment analysis for insight' do
      result = aligner.analyze_insight(insight, objectives: objectives)

      expect(result[:alignment_score]).to eq(0.75)
      expect(result[:aligned_objective_ids]).to include(1, 2)
    end
  end

  describe '#analyze_idea' do
    let(:idea) do
      double('Idea',
        id: 1,
        title: 'Add CSV export feature',
        description: 'Allow users to export data as CSV',
        idea_type: 'feature',
        effort_estimate: 'medium',
        impact_estimate: 'high',
        rationale: 'Improves user workflow',
        project: project
      )
    end

    let(:ai_response) do
      {
        'alignment_score' => 0.9,
        'aligned_objective_ids' => [1],
        'contradicted_objective_ids' => [],
        'analysis' => 'Directly supports revenue objective through feature differentiation',
        'business_impact' => 'High positive impact on revenue'
      }
    end

    let(:mock_response) do
      double('Response',
        content: [double('Content', text: ai_response.to_json)],
        stop_reason: 'end_turn'
      )
    end

    before do
      allow(mock_messages).to receive(:create).and_return(mock_response)
    end

    it 'returns alignment analysis for idea' do
      result = aligner.analyze_idea(idea, objectives: objectives)

      expect(result[:alignment_score]).to eq(0.9)
      expect(result[:aligned_objective_ids]).to eq([1])
    end
  end
end
