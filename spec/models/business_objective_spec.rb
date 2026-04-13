require 'rails_helper'

RSpec.describe BusinessObjective, type: :model do
  describe 'associations' do
    it { should belong_to(:project) }
  end

  describe 'validations' do
    it { should validate_presence_of(:title) }
    it { should validate_presence_of(:objective_type) }
    it { should validate_presence_of(:priority) }
    it { should validate_presence_of(:status) }
  end

  describe 'enums' do
    it {
      should define_enum_for(:objective_type).with_values(
        revenue: 0, growth: 1, retention: 2, efficiency: 3, market_expansion: 4
      )
    }

    it {
      should define_enum_for(:priority).with_values(
        low: 0, medium: 1, high: 2, critical: 3
      )
    }

    it {
      should define_enum_for(:status).with_values(
        active: 0, achieved: 1, paused: 2, abandoned: 3
      )
    }
  end

  describe 'scopes' do
    let(:project) { create(:project) }

    describe '.active_objectives' do
      it 'returns only active objectives with active status' do
        active_obj = create(:business_objective, project: project, active: true, status: :active)
        inactive_obj = create(:business_objective, project: project, active: false, status: :active)
        paused_obj = create(:business_objective, project: project, active: true, status: :paused)

        result = BusinessObjective.active_objectives
        expect(result).to include(active_obj)
        expect(result).not_to include(inactive_obj, paused_obj)
      end
    end

    describe '.by_priority' do
      it 'orders by priority descending' do
        low = create(:business_objective, project: project, priority: :low)
        critical = create(:business_objective, project: project, priority: :critical)
        high = create(:business_objective, project: project, priority: :high)

        result = BusinessObjective.by_priority
        expect(result.to_a).to eq([critical, high, low])
      end
    end

    describe '.upcoming' do
      it 'returns objectives with future target dates' do
        future = create(:business_objective, project: project, target_date: 30.days.from_now)
        past = create(:business_objective, project: project, target_date: 10.days.ago)

        result = BusinessObjective.upcoming
        expect(result).to include(future)
        expect(result).not_to include(past)
      end
    end

    describe '.overdue' do
      it 'returns active objectives with past target dates' do
        overdue = create(:business_objective, project: project, target_date: 10.days.ago, active: true, status: :active)
        future = create(:business_objective, project: project, target_date: 30.days.from_now, active: true, status: :active)

        result = BusinessObjective.overdue
        expect(result).to include(overdue)
        expect(result).not_to include(future)
      end
    end
  end

  describe '.for_ai_context' do
    let(:project) { create(:project) }

    it 'returns formatted objectives for AI processing' do
      obj = create(:business_objective,
        project: project,
        title: 'Increase Revenue',
        description: 'Grow MRR',
        objective_type: :revenue,
        priority: :high,
        success_metrics: 'MRR > $100K',
        active: true,
        status: :active
      )

      result = BusinessObjective.for_ai_context(project: project)

      expect(result).to be_an(Array)
      expect(result.first).to include(
        id: obj.id,
        title: 'Increase Revenue',
        description: 'Grow MRR',
        type: 'revenue',
        priority: 'high',
        success_metrics: 'MRR > $100K'
      )
    end

    it 'only includes active objectives' do
      active = create(:business_objective, project: project, active: true, status: :active)
      inactive = create(:business_objective, project: project, active: false)

      result = BusinessObjective.for_ai_context(project: project)

      expect(result.map { |o| o[:id] }).to include(active.id)
      expect(result.map { |o| o[:id] }).not_to include(inactive.id)
    end
  end

  describe 'instance methods' do
    let(:project) { create(:project) }

    describe '#priority_label' do
      it 'returns titleized priority' do
        obj = build(:business_objective, priority: :critical)
        expect(obj.priority_label).to eq('Critical')
      end
    end

    describe '#objective_type_label' do
      it 'returns humanized objective type' do
        obj = build(:business_objective, objective_type: :market_expansion)
        expect(obj.objective_type_label).to eq('Market Expansion')
      end
    end

    describe '#status_label' do
      it 'returns titleized status' do
        obj = build(:business_objective, status: :achieved)
        expect(obj.status_label).to eq('Achieved')
      end
    end

    describe '#overdue?' do
      it 'returns true for active objectives past target date' do
        obj = build(:business_objective, status: :active, target_date: 10.days.ago)
        expect(obj.overdue?).to be true
      end

      it 'returns false for future target dates' do
        obj = build(:business_objective, status: :active, target_date: 30.days.from_now)
        expect(obj.overdue?).to be false
      end

      it 'returns false for non-active objectives' do
        obj = build(:business_objective, status: :paused, target_date: 10.days.ago)
        expect(obj.overdue?).to be false
      end

      it 'returns false when target_date is nil' do
        obj = build(:business_objective, status: :active, target_date: nil)
        expect(obj.overdue?).to be false
      end
    end

    describe '#days_until_target' do
      it 'returns positive days for future dates' do
        obj = build(:business_objective, target_date: 30.days.from_now.to_date)
        expect(obj.days_until_target).to eq(30)
      end

      it 'returns negative days for past dates' do
        obj = build(:business_objective, target_date: 10.days.ago.to_date)
        expect(obj.days_until_target).to eq(-10)
      end

      it 'returns nil when target_date is nil' do
        obj = build(:business_objective, target_date: nil)
        expect(obj.days_until_target).to be_nil
      end
    end
  end
end
