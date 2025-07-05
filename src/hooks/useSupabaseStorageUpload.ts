'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from './use-toast';

interface UseSupabaseStorageUploadOptions {
  bucketName: string;
}

interface UploadFileParams {
  file: File;
  filePathInBucket: string; // e.g., `user-${userId}/${Date.now()}-${fileName}`
  cacheControl?: string;
  upsert?: boolean;
}

interface SupabaseStorageUploadState {
  isUploading: boolean;
  error: Error | null;
  uploadedFilePath: string | null;
  uploadFile: (params: UploadFileParams) => Promise<string | null>;
}

export function useSupabaseStorageUpload({
  bucketName,
}: UseSupabaseStorageUploadOptions): SupabaseStorageUploadState {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(
    async ({
      file,
      filePathInBucket,
      cacheControl = '3600',
      upsert = false,
    }: UploadFileParams): Promise<string | null> => {
      setIsUploading(true);
      setError(null);
      setUploadedFilePath(null);
      toast({
        title: 'File Upload Starting',
        description: `Uploading "${file.name}" to storage.`,
      });

      try {
        const { data, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePathInBucket, file, {
            cacheControl,
            upsert,
          });

        if (uploadError) {
          throw uploadError;
        }

        if (!data || !data.path) {
          throw new Error(
            'File uploaded but no path was returned from Supabase Storage.'
          );
        }

        setUploadedFilePath(data.path);
        toast({
          title: 'File Upload Successful',
          description: `"${file.name}" stored at ${data.path}.`,
        });
        return data.path;
      } catch (e) {
        const uploadErr = e as Error;
        console.error(
          `Supabase Storage upload error to bucket "${bucketName}":`,
          uploadErr
        );
        setError(uploadErr);
        toast({
          title: 'File Upload Failed',
          description: uploadErr.message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [bucketName, toast]
  );

  return { isUploading, error, uploadedFilePath, uploadFile };
}
