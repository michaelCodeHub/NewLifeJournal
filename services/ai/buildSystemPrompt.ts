import { PregnancyContext } from './types';

// Shared system-prompt builder, used regardless of which AI provider the
// backend is configured to call. Previously duplicated per-provider service
// class; now provider-agnostic since the actual API call happens server-side.
export function buildSystemPrompt(context: PregnancyContext): string {
  const { pregnancy, recentVisits, recentSymptoms, allSymptoms, recentMilestones, weekInfo } = context;

  const daysUntilDue = Math.ceil(
    (pregnancy.dueDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const week = pregnancy.currentWeek;
  const trimester = week <= 12 ? 1 : week <= 27 ? 2 : 3;

  const toneGuide: Record<number, string> = {
    1: 'The user is in their first trimester. Be especially reassuring about early symptoms like nausea and fatigue. Focus on what to expect at upcoming appointments.',
    2: 'The user is in their second trimester, often called the "honeymoon" period. Celebrate milestones like feeling first kicks. Focus on nutrition and staying active.',
    3: 'The user is in their third trimester and approaching delivery. Focus on birth preparation, hospital readiness, and managing late-pregnancy discomfort. Be encouraging about the home stretch.',
  };

  let prompt = `You are a supportive, knowledgeable AI assistant for a pregnancy tracking app called Bloom & Bump.

IMPORTANT GUIDELINES:
- Provide helpful, evidence-based information about pregnancy
- Be empathetic, supportive, and encouraging
- Always recommend consulting healthcare providers for medical concerns
- Never provide specific medical diagnoses or treatment recommendations
- Use the user's pregnancy data to give personalized, context-aware responses
- Keep responses conversational and easy to understand
- Address the user by name when appropriate

CONVERSATION TONE:
${toneGuide[trimester]}

USER'S PREGNANCY INFORMATION:
- Mother's name: ${pregnancy.motherName}
- Current week: ${week} of 40 weeks (Trimester ${trimester})
- Due date: ${pregnancy.dueDate.toDate().toLocaleDateString()}
- Days until due: ${daysUntilDue} days`;

  if (pregnancy.babyName) {
    prompt += `\n- Baby's name: ${pregnancy.babyName}`;
  }

  if (pregnancy.hospital) {
    prompt += `\n- Hospital: ${pregnancy.hospital}`;
  }

  if (pregnancy.doctorName) {
    prompt += `\n- Doctor: ${pregnancy.doctorName}`;
  }

  if (weekInfo) {
    prompt += `\n\nTHIS WEEK'S DETAILS (Week ${weekInfo.week}):`;
    prompt += `\n- Baby size: ${weekInfo.babySize}`;
    prompt += `\n- Baby length: ${weekInfo.babyLength}`;
    prompt += `\n- Baby weight: ${weekInfo.babyWeight}`;
    if (weekInfo.babyDevelopment.length > 0) {
      prompt += `\n- Development: ${weekInfo.babyDevelopment.join('; ')}`;
    }
    if (weekInfo.motherChanges.length > 0) {
      prompt += `\n- Mother's changes: ${weekInfo.motherChanges.join('; ')}`;
    }
    if (weekInfo.tips.length > 0) {
      prompt += `\n- Tips: ${weekInfo.tips.join('; ')}`;
    }
  }

  if (recentSymptoms.length > 0) {
    prompt += `\n\nRECENT SYMPTOMS (last 5):`;
    recentSymptoms.slice(0, 5).forEach(s => {
      prompt += `\n- ${s.type.replace('_', ' ')} (severity ${s.severity}/5) on ${s.date.toDate().toLocaleDateString()}`;
      if (s.notes) prompt += ` - ${s.notes}`;
    });
  }

  if (allSymptoms && allSymptoms.length > 0) {
    const symptomCounts: Record<string, number> = {};
    allSymptoms.forEach(s => {
      const type = s.type.replace('_', ' ');
      symptomCounts[type] = (symptomCounts[type] || 0) + 1;
    });
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topSymptoms.length > 0) {
      prompt += `\n\nSYMPTOM PATTERNS (most frequent across pregnancy):`;
      topSymptoms.forEach(([type, count]) => {
        prompt += `\n- ${type}: reported ${count} time${count > 1 ? 's' : ''}`;
      });
    }
  }

  const now = new Date();
  if (recentVisits.length > 0) {
    const pastVisits = recentVisits.filter(v => v.date.toDate() <= now);
    const upcomingVisits = recentVisits.filter(v => v.date.toDate() > now);

    if (pastVisits.length > 0) {
      prompt += `\n\nRECENT HOSPITAL VISITS:`;
      pastVisits.slice(0, 3).forEach(v => {
        prompt += `\n- ${v.type} on ${v.date.toDate().toLocaleDateString()} (week ${v.week})`;
        if (v.notes) prompt += ` - ${v.notes}`;
      });
    }

    if (upcomingVisits.length > 0) {
      prompt += `\n\nUPCOMING APPOINTMENTS:`;
      upcomingVisits.slice(0, 3).forEach(v => {
        prompt += `\n- ${v.type} on ${v.date.toDate().toLocaleDateString()}`;
      });
    }
  }

  if (recentMilestones.length > 0) {
    prompt += `\n\nRECENT MILESTONES:`;
    recentMilestones.slice(0, 3).forEach(m => {
      prompt += `\n- ${m.title} on ${m.date.toDate().toLocaleDateString()}`;
    });
  }

  return prompt;
}
