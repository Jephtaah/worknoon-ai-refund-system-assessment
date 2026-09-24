const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all|any|previous|the)?\s*(polic(y|ies)|instructions?|rules?)/i,
  /disregard\s+(all|any|previous|the)?\s*(polic(y|ies)|instructions?|rules?)/i,
  /system\s*prompt/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions)/i,
  /you\s+are\s+(now\s+)?an?\s+ai/i,
  /as\s+an?\s+ai/i,
  /override\s+(the\s+)?(polic(y|ies)|system)/i,
  /\b(i'?m|i\s+am)\s+(a|an)?\s*(vip|manager|ceo|owner|admin|executive)\b/i,
];

function daysSince(dateString) {
  const purchase = new Date(`${dateString}T00:00:00Z`);
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.floor((today - purchase) / 86_400_000);
}

function finalize(decision, reasoning, checks, source, confidence) {
  return {
    decision,
    reasoning,
    policy_checks: checks,
    escalated: decision === 'escalated',
    source,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

export function evaluateDeterministic({ order, message, policy }) {
  const checks = [];

  const suspicious = SUSPICIOUS_PATTERNS.some((re) => re.test(message));
  checks.push({ rule: 'injection_pattern', result: suspicious ? 'fail' : 'pass' });
  if (suspicious) {
    return finalize(
      'escalated',
      'This request contains language that looks like an attempt to override policy or extract internal instructions, so it needs a human to review it.',
      checks,
      'deterministic',
    );
  }

  const isFinalSale = order.status === 'final_sale' && policy.final_sale_no_refund;
  checks.push({ rule: 'final_sale', result: isFinalSale ? 'fail' : 'pass' });
  if (isFinalSale) {
    return finalize('denied', 'This item was marked final sale and is not eligible for a refund.', checks, 'deterministic');
  }

  const days = daysSince(order.purchase_date);
  const withinWindow = days <= policy.refund_window_days;
  checks.push({ rule: 'refund_window', result: withinWindow ? 'pass' : 'fail', detail: `${days} days since purchase` });
  if (!withinWindow) {
    return finalize(
      'denied',
      `This order was placed ${days} days ago, which is outside the ${policy.refund_window_days}-day refund window.`,
      checks,
      'deterministic',
    );
  }

  const overThreshold = order.price > policy.human_review_threshold_usd;
  checks.push({ rule: 'amount_threshold', result: overThreshold ? 'fail' : 'pass' });
  if (overThreshold) {
    return finalize(
      'escalated',
      `This order is over the $${policy.human_review_threshold_usd} review threshold, so a human needs to confirm it.`,
      checks,
      'deterministic',
    );
  }

  const eligibleCondition = policy.auto_approve_conditions.includes(order.order_condition);
  checks.push({ rule: 'order_condition', result: eligibleCondition ? 'ambiguous' : 'n/a' });
  if (!eligibleCondition) {
    return finalize(
      'approved',
      'Standard return, within the window, with no reported issue with the item.',
      checks,
      'deterministic',
    );
  }

  return null; // damaged / incorrect_item, everything else checks out — genuinely ambiguous, ask the AI
}

export function enforcePolicy(aiResult, order, policy) {
  const checks = [{ rule: 'ai_response_valid', result: aiResult ? 'pass' : 'fail' }];

  if (!aiResult) {
    return finalize(
      'escalated',
      'The AI response could not be validated, so this was escalated for a human to review.',
      checks,
      'ai',
    );
  }

  const overThreshold = aiResult.decision === 'approved' && order.price > policy.human_review_threshold_usd;
  checks.push({ rule: 'amount_threshold_post_ai', result: overThreshold ? 'fail' : 'pass' });
  if (overThreshold) {
    return finalize(
      'escalated',
      'The AI recommended approval, but this order is over the review threshold, so a human needs to confirm it.',
      checks,
      'ai',
    );
  }

  return finalize(aiResult.decision, aiResult.reasoning, checks, 'ai', aiResult.confidence);
}
