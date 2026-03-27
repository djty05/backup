import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId } = await req.json();

    if (!reportId) {
      return Response.json({ error: 'reportId required' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.CampaignReport.get(reportId);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Build metrics summary from stored asset_metrics
    let assetMetrics = report.asset_metrics || [];
    if (assetMetrics.length === 0 && report.asset_metrics_json) {
      try { assetMetrics = JSON.parse(report.asset_metrics_json); } catch (e) {}
    }

    const metricsSummary = assetMetrics.length > 0
      ? assetMetrics.map((a, i) => `Deliverable ${i + 1} (${a.label || a.type}): ${JSON.stringify(a.metrics)}`).join('\n')
      : `total_views: ${report.total_views}, total_reach: ${report.total_reach}, likes: ${report.likes}, engagement_rate: ${report.engagement_rate}`;

    const firstName = report.creator_name.split(' ')[0].charAt(0).toUpperCase() + report.creator_name.split(' ')[0].slice(1).toLowerCase();
    
    const qualitativeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a talent management agency writing a client-facing campaign report to showcase ${firstName}'s performance.

Metrics extracted:
${metricsSummary || 'None'}

Generate:
1. top_sentiments: 4-6 specific audience behaviour tags describing how the audience responded, e.g. "High purchase intent", "Strong brand affinity", "Authentic engagement". Focus on positive signals that demonstrate ${firstName}'s effectiveness.

2. vibe_analysis: 2-3 sentences about ${firstName}'s content quality, authenticity, and how their audience responded. DO NOT repeat the numbers — they are shown separately. Focus on what ${firstName} did well, their content voice, and audience connection. Highlight why they are effective for brands.

3. extension_pitch: A specific follow-up campaign idea with concrete deliverables (e.g., "3 Instagram Reels featuring..."). Keep it punchy and actionable—what should the brand do next based on what worked?

Post URL: ${report.content_link || 'not provided'}`,
      response_json_schema: {
        type: 'object',
        properties: {
          top_sentiments: { type: 'array', items: { type: 'string' } },
          vibe_analysis: { type: 'string' },
          extension_pitch: { type: 'string' },
        },
      },
    });

    const update = {};
    if (qualitativeResult.top_sentiments?.length) update.top_sentiments = qualitativeResult.top_sentiments;
    if (qualitativeResult.vibe_analysis) update.vibe_analysis = qualitativeResult.vibe_analysis;
    if (qualitativeResult.extension_pitch) update.extension_pitch = qualitativeResult.extension_pitch;

    await base44.asServiceRole.entities.CampaignReport.update(reportId, update);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});