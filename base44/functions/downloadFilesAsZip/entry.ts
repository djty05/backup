import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import JSZip from 'npm:jszip@3.10.1';

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

    const fileUrls = report.uploaded_file_urls || [];
    if (fileUrls.length === 0) {
      return Response.json({ error: 'No files to download' }, { status: 400 });
    }

    const zip = new JSZip();

    // Fetch and add each file to the zip
    for (let i = 0; i < fileUrls.length; i++) {
      try {
        const response = await fetch(fileUrls[i]);
        if (!response.ok) continue;
        
        const blob = await response.arrayBuffer();
        const filename = `file-${i + 1}${getExtension(fileUrls[i])}`;
        zip.file(filename, blob);
      } catch (err) {
        console.error(`Failed to fetch file ${i + 1}:`, err.message);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="report-files.zip"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.[^/.]+$/);
    return match ? match[0] : '';
  } catch {
    return '';
  }
}