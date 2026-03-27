import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function fetchDriveFiles(folderId, accessToken) {
  const authHeader = { Authorization: `Bearer ${accessToken}` };
  const query = encodeURIComponent(
    `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/pdf') and trashed = false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&pageSize=50`,
    { headers: authHeader }
  );
  const data = await res.json();
  console.log(`  Folder ${folderId} status: ${res.status}, files found: ${data.files?.length ?? 0}`);
  if (!data.files) console.log('  Unexpected response:', JSON.stringify(data));
  return data.files || [];
}

function extractFolderId(driveUrl) {
  if (!driveUrl) return null;
  const m = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function makeFilePublic(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }
  );
  if (!res.ok) {
    console.log(`  Could not make file ${fileId} public: ${res.status}`);
  }
}

async function getPublicFileUrlsFromFolderLinks(folderLinks, accessToken) {
  const urls = [];
  for (const link of (folderLinks || [])) {
    if (!link) continue;
    const folderId = extractFolderId(link);
    if (!folderId) { console.log('Could not parse folder ID from:', link); continue; }
    const files = await fetchDriveFiles(folderId, accessToken);
    for (const f of files) {
      await makeFilePublic(f.id, accessToken);
      const url = `https://drive.google.com/uc?export=download&id=${f.id}`;
      console.log(`  Ready: ${f.name} -> ${url}`);
      urls.push(url);
    }
  }
  return urls;
}

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId, driveFolderLink, deliverables, postUrl, platforms } = await req.json();

    console.log('reportId:', reportId);
    console.log('driveFolderLink:', driveFolderLink);
    console.log('deliverables:', JSON.stringify(deliverables));

    const allAssetMetrics = [];

    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
      const accessToken = conn.accessToken;
      console.log('Drive connected.');

      for (let i = 0; i < (deliverables || []).length; i++) {
        const d = deliverables[i];
        const placementType = (d.placement_types || []).join(' + ') || 'post';
        const platformStr = (d.platforms || []).join('/') || 'social media';
        const label = `${platformStr} / ${placementType}`;

        const rawLinks = (d.driveFolderLinks || []).filter(Boolean);
        const linksToUse = rawLinks.length > 0 ? rawLinks : [driveFolderLink].filter(Boolean);

        console.log(`Deliverable ${i + 1} "${label}" links:`, JSON.stringify(linksToUse));

        const fileUrls = await getPublicFileUrlsFromFolderLinks(linksToUse, accessToken);
        console.log(`Deliverable ${i + 1}: ${fileUrls.length} file(s) ready`);

        if (fileUrls.length === 0) {
          allAssetMetrics.push({ type: placementType, platform: d.platforms?.[0] || '', label, metrics: {} });
          continue;
        }

        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a social media analytics expert. Read these ${fileUrls.length} file(s) for a ${platformStr} ${placementType} influencer post. Extract every metric number explicitly shown. Return null for anything not visible.

Fields:
- total_views: video plays or views (not reach)
- total_reach: unique accounts reached
- likes: likes or hearts
- comments_count: number of comments
- shares: shares or reposts
- saves: saves or bookmarks
- link_clicks: link clicks or swipe-ups
- engagement_rate: as a number e.g. 4.2 for 4.2%
- story_taps_forward: forward taps
- story_taps_back: back taps

If this is a Foam report with a table, only read the "${placementType}" row.`,
          file_urls: fileUrls,
          response_json_schema: {
            type: 'object',
            properties: {
              total_views: { type: ['number', 'null'] },
              total_reach: { type: ['number', 'null'] },
              likes: { type: ['number', 'null'] },
              comments_count: { type: ['number', 'null'] },
              shares: { type: ['number', 'null'] },
              saves: { type: ['number', 'null'] },
              link_clicks: { type: ['number', 'null'] },
              engagement_rate: { type: ['number', 'null'] },
              story_taps_forward: { type: ['number', 'null'] },
              story_taps_back: { type: ['number', 'null'] },
            },
          },
        });

        console.log(`Deliverable ${i + 1} result:`, JSON.stringify(extractionResult));

        allAssetMetrics.push({
          type: placementType,
          platform: d.platforms?.[0] || '',
          label,
          metrics: extractionResult || {},
        });
      }

    } catch (driveErr) {
      console.log('Drive error:', driveErr.message);
    }

    const platformContext = (platforms || []).join(', ') || 'social media';
    const metricsSummary = allAssetMetrics
      .map((a, i) => `Deliverable ${i + 1} (${a.label}): ${JSON.stringify(a.metrics)}`)
      .join('\n');

    const qualitativeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an influencer marketing analyst for Good Answer agency.

Metrics extracted:
${metricsSummary || 'None'}

Generate:
1. top_sentiments: 4-6 specific audience behaviour tags e.g. "Asking where to buy"
2. vibe_analysis: 2-3 sentences referencing the actual numbers above
3. extension_pitch: 2-3 sentences with concrete next-campaign ideas
4. extraction_notes: what was and was not readable

Post URL: ${postUrl || 'not provided'}`,
      response_json_schema: {
        type: 'object',
        properties: {
          top_sentiments: { type: 'array', items: { type: 'string' } },
          vibe_analysis: { type: 'string' },
          extension_pitch: { type: 'string' },
          extraction_notes: { type: 'string' },
        },
      },
    });

    const rollup = aggregateMetrics(allAssetMetrics);
    console.log('Rollup:', JSON.stringify(rollup));

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

    console.log('Saving:', JSON.stringify(update));
    await base44.asServiceRole.entities.CampaignReport.update(reportId, update);

    return Response.json({ success: true, deliverables_processed: allAssetMetrics.length });

  } catch (error) {
    console.error('Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
