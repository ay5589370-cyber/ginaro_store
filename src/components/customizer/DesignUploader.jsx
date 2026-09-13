import { useRef, useState } from 'react'

const acceptedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

function DesignUploader({ upload, onUpload, onRemoveUpload }) {
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  const processFile = (file) => {
    if (!file) return

    if (!acceptedTypes.includes(file.type)) {
      setMessage('Please upload PNG, JPG, JPEG or WEBP.')
      return
    }

    if (file.size > maxFileSize) {
      setMessage('Image must be smaller than 10 MB.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setMessage('')
    onUpload({
      file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      previewUrl,
      visible: true,
    })
  }

  const handleDrop = (event) => {
    event.preventDefault()
    processFile(event.dataTransfer.files?.[0])
  }

  return (
    <section className="customizer-card">
      <div className="customizer-section-head">
        <h2>Upload Your Design</h2>
      </div>
      <div
        className="upload-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <strong>Drop your image here</strong>
        <span>PNG, JPG, JPEG or WEBP up to 10 MB</span>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => processFile(event.target.files?.[0])}
        />
      </div>
      <p className="quality-note">
        For best print quality, upload a high-resolution PNG with a transparent background.
      </p>
      {message && <p className="upload-message">{message}</p>}
      {upload && (
        <div className="upload-preview-row">
          <img src={upload.previewUrl} alt={`${upload.fileName} preview`} />
          <div>
            <strong>{upload.fileName}</strong>
            <span>{Math.max(1, Math.round(upload.fileSize / 1024))} KB</span>
          </div>
          <button
            type="button"
            onClick={onRemoveUpload}
            aria-label={`Remove uploaded design ${upload.fileName}`}
          >
            Remove
          </button>
        </div>
      )}
    </section>
  )
}

export default DesignUploader
