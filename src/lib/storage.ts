export async function uploadImageToSupabase(file: File, bucketName: string = 'images'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucketName);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const data = await res.json();
  return data.url;
}

export async function uploadMultipleImages(files: File[], bucketName: string = 'images'): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadImageToSupabase(file, bucketName);
    urls.push(url);
  }
  return urls;
}
