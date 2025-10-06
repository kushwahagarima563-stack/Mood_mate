"use client";

import React, { useRef, useState } from 'react';
import type { SelfieItem } from '../../lib/selfieTypes';

export default function SelfieUploader({ onUploaded }: { onUploaded: (item: SelfieItem) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError(null);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const onSubmit = async () => {
    if (!file) {
      setError('Please select an image first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Optionally pass user_id if you have auth context
      // fd.append('user_id', userId);

      const res = await fetch('/api/selfie', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      onUploaded(data.selfie as SelfieItem);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-2">Add a Selfie</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            onClick={onPick}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Take/Upload Selfie
          </button>
          <button
            onClick={onSubmit}
            disabled={!file || submitting}
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50 hover:bg-green-700 transition"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {preview && (
          <div className="flex items-center gap-4">
            <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded" />
            <span className="text-sm text-gray-600">Preview</span>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
