async function callFunction(name, payload) {
  const { base44 } = await import('./base44Client.js');
  return base44.functions.invoke(name, payload);
}

export const extractReportData = (payload) => callFunction('extractReportData', payload);
export const uploadToGoogleDrive = (payload) => callFunction('uploadToGoogleDrive', payload);
export const createReport = (payload) => callFunction('createReport', payload);
export const getReport = (payload) => callFunction('getReport', payload);
export const parseFoamReport = (payload) => callFunction('parseFoamReport', payload);
export const listReports = (payload) => callFunction('listReports', payload);
export const getReportBySlug = (payload) => callFunction('getReportBySlug', payload);
export const updateReportStatus = (payload) => callFunction('updateReportStatus', payload);
export const deleteReport = (payload) => callFunction('deleteReport', payload);
export const updateReport = (payload) => callFunction('updateReport', payload);
export const regenAnalysis = (payload) => callFunction('regenAnalysis', payload);

export async function uploadFile(file) {
  const { base44 } = await import('./base44Client.js');
  const result = await base44.integrations.Core.UploadFile({ file });
  return { file_url: result.file_url };
}