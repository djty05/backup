import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const METRIC_KEYS = ['total_views','total_reach','likes','comments_count','shares','saves','link_clicks','engagement_rate','story_taps_forward','story_taps_back'];

function aggregateMetrics(allAssetMetrics) {
  const RATE_FIELDS = ['engagement_rate', 'story_taps_back', 'story_taps_forward'];
  const totals = {};
  const rateSums = {};
  const rateCounts = {};
  for (const asset of allAssetMetrics) {
    for (const [key, val] of Object.entries(asset.metrics || {})) {
      if (val == null || typeof val !== 'number') continue;
      if (RATE_FIELDS.includes(key)) {
        rateSums[key] = (rateSums[key] || 0) + val;
        rateCounts[key] = (rateCounts[key] || 0) + 1;
      } else {
        totals[key] = (totals[key] || 0) + val;
      }
    }
  }
  for (const key of Object.keys(rateSums)) {
    totals[key] = Math.round((rateSums[key] / rateCounts[key]) * 100) / 100;
  }
  return totals;
}

// Safely extract only known metric keys from an object (handles nested 'response' wrapping)
function extractMetrics(raw) {
  if (!raw || typeof raw !== 'object') return null;
  // Unwrap if LLM returned { response: { ...metrics } }
  const data = (raw.response && typeof raw.response === 'object') ? raw.response : raw;
  const result = {};
  for (const key of METRIC_KEYS) {
    if (data[key] != null) result[key] = data[key];
  }
  return Object.keys(result).length > 0 ? result : null;
}

Deno.serve(async (req) => {
  const logs = [];
  const log = (msg) => {
    const fullMsg = '[' + new Date().toISOString() + '] ' + msg;
    console.log(fullMsg);
    logs.push(fullMsg);
  };

  try {
    const base44 = createClientFromRequest(req);
    const { reportId, deliverables, postUrl, portfolioVideos } = await req.json();

    log('reportId: ' + reportId);
    log('deliverables: ' + JSON.stringify(deliverables));

    const allAssetMetrics = [];

    for (let i = 0; i < (deliverables || []).length; i++) {
      const d = deliverables[i];
      const dPlatforms = d.platforms || [];
      const placementTypes = d.placement_types || ['post'];
      const fileUrls = (d.uploadedFileUrls || []).filter(Boolean);
      const deliverableName = d.name || null;

      if (fileUrls.length === 0) {
        for (const placementType of placementTypes) {
          const platform = dPlatforms[0] || '';
          const autoLabel = dPlatforms.length > 0 ? dPlatforms.join(' + ') + ' / ' + placementType : placementType;
          const label = deliverableName || autoLabel;
          allAssetMetrics.push({ type: placementType, platform, label, metrics: {} });
        }
        continue;
      }

      const isStory = placementTypes.some(p => p.toLowerCase().includes('story'));

      const metricSchema = {
        type: 'object',
        properties: {
          total_views: { type: 'number', description: 'Views, Plays, or Impressions' },
          total_reach: { type: 'number', description: 'Unique accounts reached' },
          likes: { type: 'number', description: 'Likes or Hearts' },
          comments_count: { type: 'number', description: isStory ? 'Comments — return null if not present for Stories' : 'Number of comments' },
          shares: { type: 'number', description: 'Shares or Reposts' },
          saves: { type: 'number', description: 'Saves or Bookmarks' },
          link_clicks: { type: 'number', description: 'Link clicks or Swipe-ups' },
          engagement_rate: { type: 'number', description: 'Engagement rate as a plain number e.g. 4.2 for 4.2%' },
          story_taps_forward: { type: 'number', description: 'Story forward taps' },
          story_taps_back: { type: 'number', description: 'Story back taps' },
        },
      };

      // Run vision (Claude Sonnet) and doc extractor in parallel
      const [visionRaw, docResults] = await Promise.all([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: 'You are extracting social media performance metrics from screenshots or analytics reports. Examine ALL provided files carefully.\n\nReturn a JSON object with these exact keys (null if not visible):\n- total_views (Views, Plays, or Impressions)\n- total_reach (Accounts reached)\n- likes\n- comments_count (Comments or Replies)\n- shares\n- saves\n- link_clicks (Link clicks or Swipe-ups)\n- engagement_rate (plain number, e.g. 4.2 for 4.2%)\n- story_taps_forward\n- story_taps_back\n\nRead every number carefully. Return null for anything not clearly visible.',
          file_urls: fileUrls,
          model: 'claude_sonnet_4_6',
          response_json_schema: {
            type: 'object',
            properties: {
              total_views: { type: 'number' },
              total_reach: { type: 'number' },
              likes: { type: 'number' },
              comments_count: { type: 'number' },
              shares: { type: 'number' },
              saves: { type: 'number' },
              link_clicks: { type: 'number' },
              engagement_rate: { type: 'number' },
              story_taps_forward: { type: 'number' },
              story_taps_back: { type: 'number' },
            },
          },
        }).catch(err => { log('Vision error: ' + err.message); return null; }),

        Promise.all(fileUrls.map(fileUrl =>
          base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: metricSchema,
          }).then(r => (r.status === 'success' && r.output) ? (Array.isArray(r.output) ? r.output[0] : r.output) : null)
            .catch(() => null)
        )),
      ]);

      // Extract only known metric keys, unwrapping any 'response' nesting from vision result
      const allResults = [extractMetrics(visionRaw), ...docResults.map(extractMetrics)].filter(Boolean);
      log('Extraction results for deliverable ' + i + ': ' + JSON.stringify(allResults));

      const mergedMetrics = {};
      for (const data of allResults) {
        for (const key of METRIC_KEYS) {
          const val = data[key];
          if (mergedMetrics[key] == null && val != null && val !== 0) {
            mergedMetrics[key] = val;
          }
        }
      }

      for (const placementType of placementTypes) {
        const platform = dPlatforms[0] || '';
        const autoLabel = dPlatforms.length > 0 ? dPlatforms.join(' + ') + ' / ' + placementType : placementType;
        const label = deliverableName || autoLabel;
        allAssetMetrics.push({ type: placementType, platform, label, metrics: { ...mergedMetrics } });
      }
    }

    const metricsSummary = allAssetMetrics
      .map((a, i) => 'Deliverable ' + (i + 1) + ' (' + a.label + '): ' + JSON.stringify(a.metrics))
      .join('\n');

    log('Metrics summary: ' + metricsSummary);

    const report = await base44.asServiceRole.entities.CampaignReport.get(reportId);
    const firstName = report.creator_name.split(' ')[0].charAt(0).toUpperCase() + report.creator_name.split(' ')[0].slice(1).toLowerCase();

    const qualitativeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: 'You are a talent management agency writing a client-facing campaign report to showcase ' + firstName + '\'s performance.\n\nMetrics extracted:\n' + (metricsSummary || 'None') + '\n\nGenerate:\n1. top_sentiments: 4-6 specific audience behaviour tags e.g. "High purchase intent", "Strong brand affinity".\n2. vibe_analysis: 2-3 sentences about ' + firstName + '\'s content quality and audience connection. Do NOT repeat numbers.\n3. extension_pitch: A specific follow-up campaign idea with concrete deliverables. Keep it punchy.\n\nPost URL: ' + (postUrl || 'not provided'),
      response_json_schema: {
        type: 'object',
        properties: {
          top_sentiments: { type: 'array', items: { type: 'string' } },
          vibe_analysis: { type: 'string' },
          extension_pitch: { type: 'string' },
        },
      },
    });

    const rollup = aggregateMetrics(allAssetMetrics);
    log('Rollup: ' + JSON.stringify(rollup));

    const update = { status: 'Needs Review' };
    if (qualitativeResult.top_sentiments?.length) update['top_sentiments'] = qualitativeResult.top_sentiments;
    if (qualitativeResult.vibe_analysis) update['vibe_analysis'] = qualitativeResult.vibe_analysis;
    if (qualitativeResult.extension_pitch) update['extension_pitch'] = qualitativeResult.extension_pitch;

    const metricFields = ['total_views', 'total_reach', 'likes', 'comments_count', 'shares', 'saves', 'link_clicks', 'engagement_rate', 'story_taps_back', 'story_taps_forward'];
    for (const f of metricFields) {
      if (rollup[f] != null) update[f] = rollup[f];
    }

    if (allAssetMetrics.length > 0) {
      update['asset_metrics'] = allAssetMetrics;
    }

    if (portfolioVideos && portfolioVideos.length > 0) {
      const hasObjects = portfolioVideos.some(v => typeof v === 'object');
      if (hasObjects) {
        update['portfolio_videos'] = portfolioVideos;
      } else {
        update['portfolio_video_urls'] = portfolioVideos;
      }
    }

    if (report?.content_links?.length > 0) {
      update.content_links = report.content_links;
    }

    log('Saving update: ' + JSON.stringify(update));
    await base44.asServiceRole.entities.CampaignReport.update(reportId, update);

    log('Success');
    return Response.json({ success: true, deliverables_processed: allAssetMetrics.length, logs });

  } catch (error) {
    console.error('Fatal error:', error.message);
    return Response.json({ error: error.message, logs }, { status: 500 });
  }
});