import { describe, it, expect } from 'vitest';
import { assessPriority, getPriorityDisplay } from './priority-engine';

describe('Priority Engine', () => {
  describe('assessPriority', () => {
    describe('Age-based factors', () => {
      it('should assign highest priority for child under 12 with abduction', () => {
        const result = assessPriority({
          age: 8,
          hoursMissing: 2,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: true,
          domesticViolenceHistory: false,
          outOfCharacter: true,
          hasFinancialResources: false,
          adverseWeather: false,
        });

        expect(result.level).toBe(0); // Critical
        expect(result.factors.some(f => f.factor === 'age_under_12')).toBe(true);
        expect(result.factors.some(f => f.factor === 'suspected_abduction')).toBe(true);
      });

      it('should apply age 12-17 weight for teenagers', () => {
        const result = assessPriority({
          age: 15,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'age_12_to_17')).toBe(true);
        expect(result.factors.find(f => f.factor === 'age_12_to_17')?.weight).toBe(20);
      });

      it('should apply senior weight for age 65+', () => {
        const result = assessPriority({
          age: 72,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'age_over_65')).toBe(true);
        expect(result.factors.find(f => f.factor === 'age_over_65')?.weight).toBe(15);
      });

      it('should not apply age factor for adults 18-64', () => {
        const result = assessPriority({
          age: 35,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'age_under_12')).toBe(false);
        expect(result.factors.some(f => f.factor === 'age_12_to_17')).toBe(false);
        expect(result.factors.some(f => f.factor === 'age_over_65')).toBe(false);
      });
    });

    describe('Medical factors', () => {
      it('should apply medical condition weight', () => {
        const result = assessPriority({
          age: 45,
          hoursMissing: 0,
          hasMedicalCondition: true,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'medical_condition')).toBe(true);
        expect(result.factors.find(f => f.factor === 'medical_condition')?.weight).toBe(30);
      });

      it('should apply medication dependency weight', () => {
        const result = assessPriority({
          age: 45,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: true,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'medication_dependency')).toBe(true);
      });

      it('should cumulate medical and medication weights', () => {
        const result = assessPriority({
          age: 45,
          hoursMissing: 0,
          hasMedicalCondition: true,
          requiresDailyMedication: true,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        const medicalWeight = result.factors.find(f => f.factor === 'medical_condition')?.weight || 0;
        const medicationWeight = result.factors.find(f => f.factor === 'medication_dependency')?.weight || 0;
        expect(result.score).toBe(medicalWeight + medicationWeight);
      });
    });

    describe('Mental health factors', () => {
      it('should apply mental health condition weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: true,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'mental_health')).toBe(true);
        expect(result.factors.find(f => f.factor === 'mental_health')?.weight).toBe(25);
      });

      it('should apply highest weight for suicidal risk', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: true,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'suicidal_risk')).toBe(true);
        expect(result.factors.find(f => f.factor === 'suicidal_risk')?.weight).toBe(35);
      });
    });

    describe('Time-based factors', () => {
      it('should apply 24+ hours weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 26,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'missing_24_plus')).toBe(true);
        expect(result.factors.find(f => f.factor === 'missing_24_plus')?.weight).toBe(10);
      });

      it('should apply 48+ hours weight instead of 24+', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 50,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'missing_48_plus')).toBe(true);
        expect(result.factors.some(f => f.factor === 'missing_24_plus')).toBe(false);
        expect(result.factors.find(f => f.factor === 'missing_48_plus')?.weight).toBe(20);
      });

      it('should apply 72+ hours weight for extended missing', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 100,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'missing_72_plus')).toBe(true);
        expect(result.factors.some(f => f.factor === 'missing_48_plus')).toBe(false);
        expect(result.factors.find(f => f.factor === 'missing_72_plus')?.weight).toBe(30);
      });

      it('should handle typo in hourssMissing field', () => {
        const result = assessPriority({
          age: 30,
          hourssMissing: 50, // Note: using the typo field
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'missing_48_plus')).toBe(true);
      });
    });

    describe('Circumstance factors', () => {
      it('should apply suspected abduction weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: true,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'suspected_abduction')).toBe(true);
        expect(result.factors.find(f => f.factor === 'suspected_abduction')?.weight).toBe(40);
      });

      it('should apply domestic violence history weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: true,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'domestic_violence_history')).toBe(true);
        expect(result.factors.find(f => f.factor === 'domestic_violence_history')?.weight).toBe(25);
      });

      it('should apply out of character weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: true,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'out_of_character')).toBe(true);
        expect(result.factors.find(f => f.factor === 'out_of_character')?.weight).toBe(15);
      });

      it('should apply no financial resources weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: false,
          adverseWeather: false,
        });

        expect(result.factors.some(f => f.factor === 'no_resources')).toBe(true);
        expect(result.factors.find(f => f.factor === 'no_resources')?.weight).toBe(10);
      });
    });

    describe('Environmental factors', () => {
      it('should apply adverse weather weight', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: true,
        });

        expect(result.factors.some(f => f.factor === 'adverse_weather')).toBe(true);
        expect(result.factors.find(f => f.factor === 'adverse_weather')?.weight).toBe(10);
      });

      it('should apply bounded weather risk points', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
          weatherRiskPoints: 7,
        });

        expect(result.factors.some(f => f.factor === 'weather_risk_points')).toBe(true);
        expect(result.factors.find(f => f.factor === 'weather_risk_points')?.weight).toBe(7);
      });

      it('should cap weather risk points at 10', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
          weatherRiskPoints: 15,
        });

        expect(result.factors.find(f => f.factor === 'weather_risk_points')?.weight).toBe(10);
      });

      it('should floor weather risk points at 0', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
          weatherRiskPoints: -5,
        });

        expect(result.factors.find(f => f.factor === 'weather_risk_points')?.weight).toBe(0);
      });
    });

    describe('Priority level calculation', () => {
      it('should return CRITICAL (0) for score >= 80', () => {
        // Child under 12 (30) + Abduction (40) + No resources (10) = 80
        const result = assessPriority({
          age: 8,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: true,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: false,
          adverseWeather: false,
        });

        expect(result.level).toBe(0);
        expect(result.score).toBeGreaterThanOrEqual(80);
      });

      it('should return HIGH (1) for score >= 60 but < 80', () => {
        // Mental health (25) + Suicidal risk (35) = 60
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: true,
          suicidalRisk: true,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.level).toBe(1);
        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.score).toBeLessThan(80);
      });

      it('should return MEDIUM (2) for score >= 40 but < 60', () => {
        // Abduction (40)
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: true,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.level).toBe(2);
        expect(result.score).toBeGreaterThanOrEqual(40);
        expect(result.score).toBeLessThan(60);
      });

      it('should return LOW (3) for score >= 20 but < 40', () => {
        // Teen (20)
        const result = assessPriority({
          age: 15,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.level).toBe(3);
        expect(result.score).toBeGreaterThanOrEqual(20);
        expect(result.score).toBeLessThan(40);
      });

      it('should return MINIMAL (4) for score < 20', () => {
        // No factors besides no resources (10)
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: false,
          adverseWeather: false,
        });

        expect(result.level).toBe(4);
        expect(result.score).toBeLessThan(20);
      });
    });

    describe('Jurisdiction profiles', () => {
      it('should use SPVM profile by default', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.jurisdiction).toBe('qc_spvm_v1');
      });

      it('should use generic profile when specified', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        }, 'generic');

        expect(result.jurisdiction).toBe('generic');
      });

      it('should fall back to generic profile for unknown jurisdiction', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        }, 'unknown_jurisdiction');

        expect(result.jurisdiction).toBe('generic');
      });

      it('should apply different weights for generic profile', () => {
        const spvmResult = assessPriority({
          age: 8,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        }, 'qc_spvm_v1');

        const genericResult = assessPriority({
          age: 8,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        }, 'generic');

        // SPVM has ageUnder12: 30, Generic has ageUnder12: 25
        expect(spvmResult.score).toBe(30);
        expect(genericResult.score).toBe(25);
      });
    });

    describe('Explanation generation', () => {
      it('should include priority level in explanation', () => {
        const result = assessPriority({
          age: 8,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: true,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: false,
          adverseWeather: false,
        });

        expect(result.explanation.some(e => e.includes('Priority Level'))).toBe(true);
      });

      it('should include jurisdiction name in explanation', () => {
        const result = assessPriority({
          age: 30,
          hoursMissing: 0,
          hasMedicalCondition: false,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.explanation.some(e => e.includes('Service de police de la Ville de Montréal'))).toBe(true);
      });

      it('should list all contributing factors', () => {
        const result = assessPriority({
          age: 8,
          hoursMissing: 0,
          hasMedicalCondition: true,
          requiresDailyMedication: false,
          hasMentalHealthCondition: false,
          suicidalRisk: false,
          suspectedAbduction: false,
          domesticViolenceHistory: false,
          outOfCharacter: false,
          hasFinancialResources: true,
          adverseWeather: false,
        });

        expect(result.explanation.some(e => e.includes('Child under 12'))).toBe(true);
        expect(result.explanation.some(e => e.includes('medical condition'))).toBe(true);
      });
    });
  });

  describe('getPriorityDisplay', () => {
    it('should return CRITICAL display for level 0', () => {
      const display = getPriorityDisplay(0);
      expect(display.label).toBe('CRITICAL');
      expect(display.labelFr).toBe('CRITIQUE');
      expect(display.color).toBe('text-red-700');
      expect(display.bgColor).toBe('bg-red-100');
    });

    it('should return HIGH display for level 1', () => {
      const display = getPriorityDisplay(1);
      expect(display.label).toBe('HIGH');
      expect(display.labelFr).toBe('ÉLEVÉ');
      expect(display.color).toBe('text-orange-700');
    });

    it('should return MEDIUM display for level 2', () => {
      const display = getPriorityDisplay(2);
      expect(display.label).toBe('MEDIUM');
      expect(display.labelFr).toBe('MOYEN');
      expect(display.color).toBe('text-yellow-700');
    });

    it('should return LOW display for level 3', () => {
      const display = getPriorityDisplay(3);
      expect(display.label).toBe('LOW');
      expect(display.labelFr).toBe('FAIBLE');
      expect(display.color).toBe('text-green-700');
    });

    it('should return MINIMAL display for level 4', () => {
      const display = getPriorityDisplay(4);
      expect(display.label).toBe('MINIMAL');
      expect(display.labelFr).toBe('MINIMAL');
      expect(display.color).toBe('text-gray-700');
    });

    it('should include French descriptions', () => {
      const display = getPriorityDisplay(0);
      expect(display.descriptionFr).toBe('Réponse immédiate requise - toutes les ressources mobilisées');
    });
  });
});
