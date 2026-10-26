import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default function AvatarUploader() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function chooseFile(candidate) {
    if (!candidate) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!ALLOWED_TYPES.has(candidate.type)) {
      setFile(null);
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setFile(candidate);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function upload() {
    if (!file || isUploading) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress(event) {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      setProgress(100);
      const url = response?.data?.url;
      if (url) setUploadedUrl(url);
    } catch (uploadError) {
      setError(
        uploadError?.response?.data?.error ||
          uploadError?.response?.data?.message ||
          uploadError?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="avatar-uploader">
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Choose or drop an avatar image"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <p>Drag and drop an image here, or click to choose a file.</p>
        <p>JPEG, PNG, WebP, or GIF · maximum 5 MB</p>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="Selected avatar preview" />
          <p>{file?.name}</p>
        </div>
      )}

      {file && (
        <button type="button" onClick={upload} disabled={isUploading}>
          {isUploading ? "Uploading…" : "Upload avatar"}
        </button>
      )}

      {(isUploading || progress > 0) && (
        <div className="progress" aria-label="Upload progress">
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      )}

      {uploadedUrl && (
        <p role="status">
          Upload complete.{" "}
          <a href={uploadedUrl} target="_blank" rel="noreferrer">
            View uploaded image
          </a>
        </p>
      )}
    </section>
  );
}
