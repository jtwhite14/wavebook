"use client";

import { useState, useRef, useCallback } from "react";
import { extractExifData, isExifSupported } from "@/lib/utils/exif";

interface PhotoEntry {
  localUrl: string;
  remoteUrl?: string;
  name: string;
  status: "pending" | "processing" | "uploading" | "done" | "failed";
  error?: string;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel limit)
const MAX_DIMENSION = 2048;

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If already small enough, return as-is
    if (file.size <= MAX_FILE_SIZE) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down to max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under limit
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }
            if (blob.size > MAX_FILE_SIZE && quality > 0.3) {
              quality -= 0.15;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If we can't load it as image, send original
      resolve(file);
    };

    img.src = url;
  });
}

export function UploadClient({ token }: { token: string }) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndUpload = useCallback(
    async (file: File, index: number) => {
      const updatePhoto = (updates: Partial<PhotoEntry>) => {
        setPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
        );
      };

      try {
        updatePhoto({ status: "processing" });

        // Extract EXIF data if supported
        let exifData = {};
        if (isExifSupported(file)) {
          exifData = await extractExifData(file);
        }

        // Resize if too large for Vercel's 4.5MB limit
        const processedFile = await resizeImage(file);

        updatePhoto({ status: "uploading" });

        const formData = new FormData();
        formData.append("file", processedFile, file.name);
        formData.append("token", token);
        formData.append("exifData", JSON.stringify(exifData));

        const response = await fetch("/api/upload/public", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Upload failed (${response.status})`
          );
        }

        const data = await response.json();
        updatePhoto({
          status: "done",
          remoteUrl: data.photoUrl,
        });
      } catch (error) {
        updatePhoto({
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
    [token]
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);

      // Immediately show all photos as local thumbnails
      const startIndex = photos.length;
      const newEntries: PhotoEntry[] = fileArray.map((file) => ({
        localUrl: URL.createObjectURL(file),
        name: file.name,
        status: "pending" as const,
      }));
      setPhotos((prev) => [...prev, ...newEntries]);

      // Process up to 3 photos at a time
      const CONCURRENCY = 3;
      for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
        const batch = fileArray.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((file, j) => processAndUpload(file, startIndex + i + j))
        );
      }

      setIsUploading(false);
    },
    [photos.length, processAndUpload]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input so the same files can be re-selected
    e.target.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const donePhotos = photos.filter((p) => p.status === "done");
  const failedPhotos = photos.filter((p) => p.status === "failed");
  const hasPhotos = photos.length > 0;
  const totalUploaded = donePhotos.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 text-center">
        <h1 className="text-xl font-bold text-foreground">
          Wavebook
        </h1>
      </header>

      <div className="flex-1 px-4 py-6">
        {/* Upload area */}
        <div className="mb-6">
          {!isUploading && !hasPhotos && (
            <>
              <p className="text-muted-foreground text-center mb-6 text-sm">
                Select surf photos from your phone to upload them to your
                Wavebook account.
              </p>
              <button
                onClick={openFilePicker}
                className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground active:opacity-90 transition-colors"
              >
                Select Photos
              </button>
            </>
          )}

          {isUploading && (
            <div className="text-center">
              <p className="text-foreground font-medium">
                Uploading {donePhotos.length} of {photos.length} photos...
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(donePhotos.length / photos.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!isUploading && hasPhotos && (
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-foreground font-semibold text-lg">
                {totalUploaded} photo{totalUploaded !== 1 ? "s" : ""} uploaded!
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                You can close this page or add more photos.
              </p>
            </div>
          )}
        </div>

        {/* Failed uploads */}
        {failedPhotos.length > 0 && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-destructive text-sm font-medium mb-1">
              {failedPhotos.length} upload{failedPhotos.length !== 1 ? "s" : ""} failed
            </p>
            {failedPhotos.map((f, i) => (
              <p key={i} className="text-destructive/80 text-xs truncate">
                {f.name}: {f.error}
              </p>
            ))}
          </div>
        )}

        {/* Photo thumbnails grid */}
        {photos.length > 0 && (
          <div className="mb-6">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
              {isUploading ? "Photos" : "Uploaded Photos"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.remoteUrl || photo.localUrl}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                  />
                  {(photo.status === "pending" ||
                    photo.status === "processing" ||
                    photo.status === "uploading") && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    </div>
                  )}
                  {photo.status === "failed" && (
                    <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add more photos button */}
        {!isUploading && hasPhotos && (
          <button
            onClick={openFilePicker}
            className="w-full rounded-xl border-2 border-primary px-6 py-4 text-lg font-semibold text-primary active:bg-primary/10 transition-colors"
          >
            Add More Photos
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
