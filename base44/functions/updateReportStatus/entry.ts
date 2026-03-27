import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId, status } = await req.json();

    if (!reportId || !status) {
      return Response.json({ error: 'Missing reportId or status' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.CampaignReport.get(reportId);
    if (existing?.status === 'Sent' && status !== 'Sent') {
      return Response.json({ error: 'Cannot modify a report that has been marked as Sent' }, { status: 403 });
    }

    await base44.asServiceRole.entities.CampaignReport.update(reportId, { status });
    
    // If status is set to Processing, re-trigger extraction with uploaded files
    if (status === 'Processing') {
      const report = await base44.asServiceRole.entities.CampaignReport.get(reportId);
      if (report?.uploaded_file_urls && report.uploaded_file_urls.length > 0) {
        // Re-trigger extraction in background with the uploaded files
        base44.asServiceRole.functions.invoke('extractReportData', {
          reportId,
          deliverables: [{
            platforms: report.platforms || [],
            placement_types: report.placement_types || [],
            uploadedFileUrls: report.uploaded_file_urls || [],
            post_url: report.content_link || ''
          }],
          postUrl: report.content_link || '',
          platforms: report.platforms || [],
          portfolioVideos: report.portfolio_video_urls || []
        }).catch(() => {});
      }
    }
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});