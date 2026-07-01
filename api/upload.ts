import { onRequestPost } from '../cloud-functions/upload/index';
import { createVercelContext, methodNotAllowed, sendResponse } from './_adapter';

export const config = {
  maxDuration: 120,
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  const response = await onRequestPost(createVercelContext(req));
  await sendResponse(res, response);
}
