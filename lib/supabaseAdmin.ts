import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Set it in your environment.');
}
if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Set it in your environment.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Ensure a storage bucket exists; create it if missing, with retries for transient errors
export async function ensureBucket(
  bucket: string,
  options: { public?: boolean; fileSizeLimit?: string; allowedMimeTypes?: string[] } = { public: true }
) {
  // Try to get the bucket first (retry on transient failures)
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data: existing, error } = await supabaseAdmin.storage.getBucket(bucket);
    if (existing && !error) return existing;
    if (error) {
      lastErr = error;
      // If clearly not found, proceed to creation immediately
      if ((error as any).status === 404 || /not.*found/i.test(error.message || '')) break;
      // Backoff on possible network/timeouts
      await sleep(250 * attempt);
      continue;
    }
    break;
  }

  // Attempt to create (retry on transient failures)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data: created, error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: options.public ?? true,
      fileSizeLimit: options.fileSizeLimit,
      allowedMimeTypes: options.allowedMimeTypes,
    } as any);

    if (created && !error) return created;

    // If bucket already exists (race), return success
    if (error && (/already exists/i.test(error.message || '') || (error as any).status === 409)) {
      const { data } = await supabaseAdmin.storage.getBucket(bucket);
      if (data) return data;
    }

    // Backoff on transient issues
    lastErr = error;
    await sleep(300 * attempt);
  }

  throw new Error(`Failed to ensure bucket "${bucket}": ${lastErr?.message || 'Unknown error'}`);
}
