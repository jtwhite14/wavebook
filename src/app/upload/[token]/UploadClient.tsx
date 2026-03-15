"use client";

import { useState, useRef, useCallback } from "react";
import { extractExifData, isExifSupported } from "@/lib/utils/exif";

interface UploadedPhoto {
  url: string;
  name: string;
}

interface FailedUpload {
  name: string;
  error: string;
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
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [failedUploads, setFailedUploads] = useState<FailedUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setTotalFiles(fileArray.length);
      setCurrentIndex(0);

      for (let i = 0; i < fileArray.length; i++) {
        setCurrentIndex(i + 1);
        const file = fileArray[i];

        try {
          // Extract EXIF data if supported
          let exifData = {};
          if (isExifSupported(file)) {
            exifData = await extractExifData(file);
          }

          // Resize if too large for Vercel's 4.5MB limit
          const processedFile = await resizeImage(file);

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
            throw new Error(errorData.error || `Upload failed (${response.status})`);
          }

          const data = await response.json();

          setUploadedPhotos((prev) => [
            ...prev,
            { url: data.photoUrl || URL.createObjectURL(file), name: file.name },
          ]);
        } catch (error) {
          setFailedUploads((prev) => [
            ...prev,
            {
              name: file.name,
              error: error instanceof Error ? error.message : "Upload failed",
            },
          ]);
        }
      }

      setIsUploading(false);
    },
    [token]
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

  const hasUploaded = uploadedPhotos.length > 0;
  const totalUploaded = uploadedPhotos.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 text-center">
        <h1 className="text-xl font-bold text-foreground">
          SurfSynch
        </h1>
      </header>

      <div className="flex-1 px-4 py-6">
        {/* Upload area */}
        <div className="mb-6">
          {!isUploading && !hasUploaded && (
            <>
              <p className="text-muted-foreground text-center mb-6 text-sm">
                Select surf photos from your phone to upload them to your
                SurfSynch account.
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
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
              </div>
              <p className="text-foreground font-medium">
                Uploading {currentIndex} of {totalFiles} photos...
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(currentIndex / totalFiles) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!isUploading && hasUploaded && (
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
        {failedUploads.length > 0 && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-destructive text-sm font-medium mb-1">
              {failedUploads.length} upload{failedUploads.length !== 1 ? "s" : ""} failed
            </p>
            {failedUploads.map((f, i) => (
              <p key={i} className="text-destructive/80 text-xs truncate">
                {f.name}: {f.error}
              </p>
            ))}
          </div>
        )}

        {/* Photo thumbnails grid */}
        {uploadedPhotos.length > 0 && (
          <div className="mb-6">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
              Uploaded Photos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {uploadedPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add more photos button */}
        {!isUploading && hasUploaded && (
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
