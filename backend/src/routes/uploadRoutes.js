const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { protect } = require('../middleware/authMiddleware')
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiters')
const { uniqueFileSuffix } = require('../utils/secureRandom')

const router = express.Router()

// Baseline rate limit for every route in this group (see middleware/rateLimiters.js).
router.use(apiLimiter)

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

/**
 * Allowed upload types.
 *
 * The extension written to disk is derived from the *validated* MIME type, never
 * from the client-supplied filename. Trusting the original name would let a
 * caller store `payload.html` or `payload.svg`, which are served from /uploads
 * and could be rendered as active content in a victim's browser.
 */
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 5

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = ALLOWED_TYPES[file.mimetype] || '.bin'
    cb(null, `files-${uniqueFileSuffix()}${safeExt}`)
  }
})

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) return cb(null, true)
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter
})

/** Translate multer errors into clear 4xx responses instead of a generic 500. */
const handleUpload = (req, res, next) =>
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next()

    const messages = {
      LIMIT_FILE_SIZE: `Each file must be ${MAX_FILE_SIZE / (1024 * 1024)} MB or smaller.`,
      LIMIT_FILE_COUNT: `You can upload at most ${MAX_FILES} files at once.`,
      LIMIT_UNEXPECTED_FILE: 'Unsupported file type. Allowed: JPG, PNG, WebP and PDF.'
    }

    return res.status(400).json({
      success: false,
      message: messages[err.code] || err.message || 'File upload failed'
    })
  })

router.post('/multiple', protect, uploadLimiter, handleUpload, (req, res) => {
  const files = (req.files || []).map((file) => ({
    filename: file.originalname,
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype
  }))

  res.json({
    success: true,
    message: 'Files uploaded successfully',
    files
  })
})

module.exports = router
