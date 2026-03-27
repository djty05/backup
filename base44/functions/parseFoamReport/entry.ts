import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Extract folder ID from a Drive URL
function extractFolderId(driveUrl) {
  const match = driveUrl?.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Get a direct download URL for a Drive file
function getDriveFileUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { google_drive_link } = await req.json();

    if (!google_drive_link) {
      return Response.json({ error: 'No Google Drive link provided' }, { status: 400 });
    }

    // Extract folder ID and list files
    const folderId = extractFolderId(google_drive_link);
    if (!folderId) {
      return Response.json({ error: 'Invalid Drive folder link' }, { status: 400 });
    }

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
      accessToken = conn.accessToken;
    } catch (err) {
      console.error('Google Drive not connected:', err.message);
      return Response.json({ assets: [] });
    }

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // List files in the folder
    let listRes;
    try {
      listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=50`,
        { headers: authHeader }
      );
      if (!listRes.ok) {
        console.error('Drive API error:', listRes.status);
        return Response.json({ assets: [] });
      }
    } catch (err) {
      console.error('Failed to fetch from Drive:', err.message);
      return Response.json({ assets: [] });
    }

    const listData = await listRes.json();
    const files = listData.files || [];

    // Find the Foam report (could be PDF, image, or spreadsheet)
    const foamFile = files.find(f => 
      f.name.toLowerCase().includes('foam') && 
      (f.mimeType.includes('image') || f.mimeType.includes('pdf') || f.mimeType.includes('sheet'))
    );

    if (!foamFile) {
      return Response.json({ assets: [] });
    }

    // Get the file URL and use AI to extract metrics
    const fileUrl = getDriveFileUrl(foamFile.id);

    const extractionPrompt = `You are analyzing a Foam report (Instagram/TikTok analytics screenshot or PDF). Extract all performance metrics and group them by asset type (reel, story, video, feed post, etc).

For each asset type found, return an object with:
- type: "reel" | "story" | "video" | "feed_post" | etc
- metrics: object with all visible metrics

Common metrics to look for:
- views, reach, impressions
- engagements, engagement_rate
- likes, comments, replies, shares
- saves, bookmarks, clicks
- followers_reached, follower_engagement_rate, reach_engagement_rate, view_engagement_rate

Return ONLY assets that are visible in the report. Be thorough and extract every metric you can see.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                metrics: {
                  type: "object",
                  additionalProperties: { type: ["number", "null"] }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({ assets: result.assets || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});